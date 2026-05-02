# Smart Attendance — Deployment Runbook

This document is the operational source of truth for deploying the backend. The frontend (Next.js) and mobile apps (Expo) have their own deploy paths and are out of scope here.

---

## 1. Required environment variables

These are validated at boot by Zod (`src/config/index.ts`). The server will exit with code 1 if any are missing or invalid.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string. Use a connection pooler URL (PgBouncer / Supabase pooler) for prod. |
| `JWT_SECRET` | yes | Minimum 32 characters. Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`. **Rotating this invalidates every existing session.** |
| `JWT_EXPIRES_IN` | no (default `24h`) | e.g. `7d`, `12h`. |
| `NODE_ENV` | no (default `development`) | Set to `production` in prod. Toggles HTTPS redirect, HSTS, error stack hiding. |
| `PORT` | no (default `5001`) | The Dockerfile exposes 5001. |
| `CORS_ORIGINS` | no | Comma-separated list of allowed origins. Default `http://localhost:3000`. |
| `FRONTEND_URL` | no | Used in QR code scan URLs and email links. |
| `REDIS_URL` | strongly recommended | Required for horizontal scaling. Without it, scan and login lockouts fall back to per-instance memory state and an attacker rotating between instances bypasses them. |
| `RESEND_API_KEY` | optional | Disables email sending if absent. |
| `RESEND_FROM_EMAIL` | no (default `noreply@zentaralabs.com`) | |
| `SLACK_ALERT_WEBHOOK_URL` | strongly recommended | When set, cron-job failures (billing, trial expiry, grace period, midnight auto-close, abandoned, price expiry) are posted to a Slack channel via [incoming webhook](https://api.slack.com/messaging/webhooks). Without it, failures still log at warn level but you'll need to be watching the log aggregator to notice. |
| `CALENDARIFIC_API_KEY` | optional | Disables holiday sync if absent. |
| `AWS_*` | optional | Document upload disabled if absent. `AWS_REGION` defaults to `ap-south-1`, `AWS_S3_BUCKET` to `smart-hr-documents`. |
| `APP_DOWNLOAD_URL` | optional | Included in welcome emails. |
| `TZ` | yes in prod | Set to `Asia/Kathmandu`. The midnight auto-close cron and BS calendar logic assume this. |

A `.env.example` lives in `backend/` with safe placeholder values.

---

## 2. Build & deploy

### Container build

```bash
cd backend
docker build -t smart-attendance-backend:$(git rev-parse --short HEAD) .
```

The Dockerfile is multi-stage: deps → builder → runtime. The runtime image runs as the non-root `node` user, uses `tini` as PID 1, and ships only production node_modules plus the compiled `dist/`.

### Run locally against a real DB

```bash
docker run --rm -p 5001:5001 \
  --env-file .env \
  smart-attendance-backend:$(git rev-parse --short HEAD)
```

### Container healthcheck

`HEALTHCHECK` hits `GET /api/v1/health` every 30s. The endpoint pings the database and Redis (when `REDIS_URL` is set) and returns 503 if either is down. Configure your orchestrator (ECS / Kubernetes / Render) to use the same endpoint as its readiness probe.

---

## 3. Database migrations

`npm run start` runs `prisma migrate deploy && node dist/server.js`. This is fine for **additive** migrations (new tables, new nullable columns, new indexes). It is **not safe for destructive ones**.

### Additive migration (safe path)

1. Author the migration locally with `npx prisma migrate dev --name <description>`.
2. Commit the generated SQL under `prisma/migrations/`.
3. Deploy. `migrate deploy` runs as part of container startup.

### Destructive migration (drops, renames, type changes)

`migrate deploy` runs *before* the new server replaces the old one. The old server will see the new schema for the duration of the rolling deploy and will crash on any reference to removed columns. To avoid this, do destructive changes in **two deploys**:

**Deploy 1 — stop using the column in code, but leave it in the schema:**
- Remove every read/write of the column in code.
- Mark the field optional in `schema.prisma` if it isn't already.
- Deploy. Verify the field is unused for at least one full release cycle.

**Deploy 2 — drop the column:**
- Generate the destructive migration (`prisma migrate dev`).
- Deploy.

### Manual migration without restarting the server

```bash
docker exec <container> npx prisma migrate deploy
```

Useful when you want to apply migrations on a maintenance window without rolling the whole service.

---

## 4. Rollback

Roll back **code first**, then evaluate whether the schema needs to follow.

### Code rollback

```bash
docker pull smart-attendance-backend:<previous-tag>
# redeploy <previous-tag>
```

Tag every image with the git short SHA at build time — never just `latest` — so this works.

### Schema rollback

Prisma does not generate down-migrations. If you need to roll a schema change back:

1. Author a *new forward migration* that reverses the previous one.
2. Apply it with `migrate deploy`.

Never edit or delete a migration that has been applied to production. Treat the `prisma/migrations/` directory as append-only.

### Session invalidation

Rotating `JWT_SECRET` invalidates every issued JWT. Every active user is forced to log in again. Combine with a `UserSession` table truncate if you want to sever refresh tokens too.

---

## 5. First-deploy checklist

- [ ] `JWT_SECRET` is at least 32 characters and stored in your secret manager (not committed)
- [ ] `DATABASE_URL` points at a pooled connection
- [ ] `REDIS_URL` is set (multi-instance deploys without this are silently insecure — see `lib/lockout.ts` and `lib/scan-lockout.ts`)
- [ ] `SLACK_ALERT_WEBHOOK_URL` is set (without it, cron-job failures only show up in logs — billing failures are a revenue risk worth alerting on)
- [ ] `NODE_ENV=production` is set so HTTPS redirect and HSTS engage
- [ ] `TZ=Asia/Kathmandu` is set so the midnight auto-close cron fires at the right wall-clock time
- [ ] Reverse proxy in front of the container terminates TLS (the app trusts `X-Forwarded-*` via `trust proxy`)
- [ ] Healthcheck endpoint `/api/v1/health` is wired to the orchestrator's readiness probe
- [ ] The default seed credentials (`OrgAdmin@123`, `Employee@123`) are not present in any production database — these are dev fixtures from `.env.example` and `pentest.sh`

---

## 6. Smoke tests after deploy

Run these against the deployed URL before declaring the deploy successful:

```bash
# 1. Health — must be 200, both database and redis "connected"
curl -s https://api.example.com/api/v1/health | jq

# 2. Version header
curl -sI https://api.example.com/api/v1/health | grep -i x-api-version

# 3. CORS preflight
curl -s -X OPTIONS https://api.example.com/api/v1/auth/login \
  -H "Origin: https://attendance.example.com" \
  -H "Access-Control-Request-Method: POST" -i | head

# 4. HTTPS redirect (in prod NODE_ENV)
curl -sI http://api.example.com/api/v1/health | grep -i location

# 5. Login lockout still works (Redis-backed)
for i in 1 2 3 4 5 6; do
  curl -s -X POST https://api.example.com/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -H "X-Requested-With: XMLHttpRequest" \
    -d '{"email":"smoke@test.invalid","password":"wrong"}'
  echo
done
# The 6th request should report "Account locked".
```

If `pentest.sh` is configured against the staging URL, run it too — it covers cross-org isolation, rate limits, and the HMAC-stripping cleanup more thoroughly than these curls.

---

## 7. Incident playbook

| Symptom | First check | Likely cause |
| --- | --- | --- |
| `/health` returns 503 with `database: disconnected` | DB connectivity, pool size, SSL cert | DB outage or exhausted pool |
| `/health` returns 503 with `redis: disconnected` | Redis URL, network, TLS settings | Redis outage. Lockouts have fallen back to per-instance memory — horizontal scale becomes insecure until restored. |
| Server fails to boot, logs `Invalid environment configuration` | The error message lists the offending vars | A required env var is missing or shorter than 32 chars |
| Every login returns 401 | `JWT_SECRET` was rotated | Expected — all sessions invalidated. Tell the team. |
| Cron jobs (billing, trial expiry) appear skipped | Container logs at the cron firing time, server `TZ` | Container restart during firing window, or wrong `TZ` |
| Mobile app can't reach API after a build | `EXPO_PUBLIC_API_URL` in the EAS build profile | Build was made against the wrong API URL — needs a new EAS build |
| Cron job alerts stopped arriving in Slack | Webhook still valid? Slack workspace admin didn't revoke it? Try `curl -X POST -H 'Content-Type: application/json' -d '{"text":"test"}' $SLACK_ALERT_WEBHOOK_URL` | Webhook revoked, channel deleted, or workspace re-invitation invalidated the URL |

---

*Maintained alongside the codebase. If you change deploy infra, update this file in the same PR.*
