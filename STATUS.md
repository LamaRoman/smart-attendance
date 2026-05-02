# Smart Attendance — Project Status & Orientation

**Last updated:** 2026-05-02
**Audience:** You, when you come back to this and need to remember what's going on.
**Read time:** 10 minutes.

---

## 1. What this app actually is

**Smart Attendance** is a multi-tenant HR + attendance app you're building.
It's already live in production:

- Backend API: `api.zentaralabs.com` (Node + Express + Prisma + Postgres, deployed on Railway)
- Frontend web: `attendance.zentaralabs.com` (Next.js 16 + React 19, deployed on Vercel)
- Mobile: React Native / Expo (no CI gate yet)
- Repo: `https://github.com/LamaRoman/smart-attendance`

**Multi-tenant** means: multiple companies ("orgs") share one database, but
each org should be fully isolated from the others. Org B should never see or
modify Org A's data — not even by guessing IDs. That's the security
property hardened over the last few weeks.

The app does: employee clock-in/out, leave management, payroll (with Nepal
tax + SSF rules), holidays (with BS calendar support), document storage,
geofencing, attendance PINs, etc.

---

## 2. The mental model — six tracks of work

Your work splits into six loose tracks. Some are nearly done, some are
just starting. Knowing which track a given task belongs to is the fastest
way to orient yourself.

| Track | What it's about | Status |
|---|---|---|
| **A. Cross-org security** | Verify Org B can't access Org A's data | ✅ Done |
| **B. Production stability** | Don't break prod again | Ongoing — reactive |
| **C. Code quality + CI** | Catch errors before they hit prod | Mostly done; 57 lint warnings remaining |
| **D. Long-term security** | TOTP, threat model, external pentest | Branch protection done; rest scheduled |
| **E. Dependency upgrades** | Keep stack current | Express done, ~9 dependabot PRs queued |
| **F. Payroll correctness** | Make sure the tax math is right | CA review pending — Step 1 in ROADMAP |

The active focus right now is **Track F** (payroll correctness) — see
ROADMAP.md Step 1.

---

## 3. What's been done so far (most recent first)

I'm reconstructing this from past handoff notes and recent session memory.
Listing newest first because the recent stuff is what tomorrow's work
depends on.

### Track C — React 19 cleanup (2026-05-02 session, 3 PRs)

- **PR #66** — `AdjustBalanceModal.tsx`: extracted `Field` to module scope.
  Was a static-component bug that recreated the input element on every
  keystroke, causing focus loss in the leave-balance editor. Bonus:
  added `onFocus={e => e.target.select()}` so clicking into a field
  showing `0` highlights it for replacement instead of forcing the user
  to type around the leading zero. Both verified in browser.
- **PR #67** — `auth-context.tsx`: wrapped `checkAuth` in `useCallback`,
  moved declaration above the calling `useEffect`, fixed deps array.
  Resolved the stale-closure / "accessed before declared" warning.
  Verified across 5 auth paths (refresh, login, logout, multi-tab,
  change-password).
- **PR #68** — `NotificationBell.tsx`: same fix shape as auth-context,
  but for two functions (`loadUnreadCount`, `loadNotifications`). The
  30-second polling interval verified intact in network tab. Tested as
  both org-admin and employee.
- Lint count: 66 → 57. Three real stale-closure bugs fixed.
- Three more files in the Phase 4a immutability cluster remaining:
  `payroll/page.tsx` (3 sites), `super-admin/plans/page.tsx`,
  `super-admin/subscriptions/page.tsx`. Same fix shape, deferred.
- Honest note: lint count didn't drop linearly — fixing the immutability
  warnings on auth-context and NotificationBell exposed
  `set-state-in-effect` warnings that were chained underneath. The
  warnings were always there; they just surfaced once the immutability
  errors cleared. Real bugs got fixed regardless.

### Track F — Payroll correctness (2026-04-27)

- **PR #63 (squash-merged)** — three frontend live-preview bug fixes:
  - Bug 1: TDS preview now rounds to whole rupees, matching backend
  - Bug 2: Replaced `??` with `||` for rate fallbacks (was letting NaN through and silently zeroing null rates)
  - Bug 3: Frontend live preview now uses basic salary as SSF/PF base (was using gross — backend uses basic)
- Companion doc `PAYROLL-AUDIT-2026-04-27.md` documents the full TDS/SSF
  calculation mechanism end-to-end and lists 5 open questions for a Nepali
  CA to validate (SST waiver scope, SSF base, deduction caps, annualization
  method, duplicate frontend/backend implementations).
- Verified all 18 test cases against published Nepal FY 2082/83 slabs.
  Slab math itself is correct; the open questions are about *interpretation*
  of which inputs to feed into it.
- Set up local dev environment with seeded data via `prisma migrate reset`.

### Track C — Code quality + CI (older)

- **PR #61** — Frontend lint + Prettier setup
  - ESLint flat config (Next 16 + React 19), Prettier with Tailwind class sorting
  - 4 npm scripts: `lint`, `lint:fix`, `format`, `format:check`
  - Frontend Lint and Frontend Format Check jobs added to CI
  - 2 real React 19 bugs fixed in same PR
- **PR #36** hardened `req.params` typing across 14 route files.
- **PR #37** added backend typecheck + test gates to CI.
- **PR #39** added frontend typecheck + build gates to CI.
- **PR #40, #41** cleanup — dead config, redundant Prisma client.
- **commit `f487cf0`** — gitleaks portability fix.

### Track A — Cross-org security (chronological, completed)

- **PR #32** added cross-org service-layer tests for the holiday module.
- **PR #35** locked those in as regression guards.
- **April 5 commit `4b0edb1`** — security cleanup. DB-backed refresh tokens
  added. Seed files deleted because they had hardcoded credentials.
- **PR #43** — HTTP-boundary cross-org tests. 34 probes in `pentest.sh`,
  section 8 has 8 cross-org probes, all pass.
- **PR #44** — Seed credentials moved to env vars (`requireEnv()` helper).
- **PR #45** — Stage 7: pentest CI workflow runs on every PR.
- **PR #47** — XSS storage and `__proto__` pollution pentest probes
  upgraded from soft-WARN to hard PASS/FAIL. Both confirmed false positives,
  documented in `SECURITY-NOTES.md`.
- **2026-04-26** — Branch protection ruleset on `main`. 9 CI checks gating,
  no bypass (admins included). Track A complete.

### Track B — Production stability

- **PR #38** upgraded Express from v4 to v5. The upgrade had a hidden bug:
  the `sanitizeInput` middleware assigned `req.query = ...`, which Express 5
  doesn't allow (read-only property). Silently broke prod auth — every
  authenticated route returned 500 for ~4 hours before anyone noticed.
- **PR #42** fixed it with `Object.defineProperty(req, 'query', ...)` and
  added a regression test that mocks Express 5's getter-only behavior.
- **PR #46** — Email service lazy init. Backend now boots without
  `RESEND_API_KEY`.
- **PR #64** — Dynamic IP resolution for dev API base URL. Shipped but
  not actually working in dev. Deferred.
- **PR #65** — QR countdown moved into Expires stat card. Working.

### Track D — Long-term security

- **DB-backed refresh tokens** (April 5) — done.
- **Credential scrub from README/seed** (April 5 + PR #44) — done.
- **Branch protection on main** (2026-04-26) — done.
- **Org-admin TOTP** — not started. ROADMAP.md Step 11.
- **Threat model document** — doesn't exist. ROADMAP.md Step 6.
- **External pentest** — not scheduled.

### Track E — Dependency upgrades

- **Express 4 → 5** — done (PR #38, #42 fixed the regression).
- **~9 dependabot PRs** are open as of 2026-05-02. Major bumps (Prisma 5→7,
  Tailwind 3→4, Expo SDK 54→55) need their own deliberate sessions —
  don't merge blindly. ROADMAP.md Step 8 triages them.
- Most major library upgrades are deferred to dedicated future sessions.

---

## 4. State of the repo right now

- 145/145 backend tests passing
- 31/34 pentest probes PASS, 0 FAIL, 3 soft WARN (documented harness limitations)
- 9 CI checks gating every PR via branch protection (11 total including Vercel), no bypasses
- Frontend lint passes (0 errors, **57 warnings** — was 66 at session start)
- Cross-org isolation verified at HTTP layer with regression guards in CI
- No hardcoded credentials in source
- Backend boots without optional env vars
- Local dev seedable via `cd backend && npx prisma migrate reset`
- Mobile app still has no CI gates (known gap, deferred)
- `main` is at the latest squash-merge (last was PR #68 — NotificationBell)
- Three feature branches active recently, all merged and deleted:
  PR #64 (dynamic IP), PR #65 (QR countdown), PR #66/67/68 (this session)

---

## 5. What's next

In priority order (also captured in ROADMAP.md):

1. **Take payroll calculations to a Nepali CA.** The 5 open questions in
   `PAYROLL-AUDIT-2026-04-27.md` (SST waiver scope, SSF base, deduction
   caps, annualization, duplicate implementations) need professional
   validation. Real-money critical.
2. **Fix any payroll issues the CA flags.** Each becomes its own follow-up
   step depending on what they say.
3. **Single source of truth for TDS calculation.** Frontend and backend
   currently have duplicate slab math — they were aligned in the payroll
   session but will drift again.
4. **React 19 migration cleanup — finish Phase 4a, then 4b.** Three more
   files in the immutability cluster (payroll/page.tsx, super-admin/plans,
   super-admin/subscriptions). Then the 19-site `set-state-in-effect`
   cluster which is style-warning territory, not real-bug territory.
5. **Frontend tests.** Lint catches some issues but not behavior bugs.
6. ... see ROADMAP.md for the rest.

---

## 6. Glossary

- **Cross-org isolation** — Org B can't read or modify Org A's data, even if
  Org B knows or guesses Org A's record IDs.
- **enforceOrgIsolation** — middleware in your backend that checks every
  request includes a valid org membership for the resource being touched.
- **Pentest probe** — a single test in `pentest.sh`. There are 34 of them.
- **Section 8** — the cross-org part of `pentest.sh`. 8 probes, all pass.
- **PR #N** — a numbered pull request on GitHub.
- **Idempotent seed** — a seed script that detects already-existing rows
  and skips them. Yours is idempotent, so re-running won't update passwords
  on existing records — only `prisma migrate reset` followed by seed will
  produce new credentials end-to-end.
- **Plan-from-memory drift** — a recurring bug where a plan written from
  memory disagrees with actual repo state. Bit us in this session at the
  branch level (4 stale origin branches that needed triage before any
  real work), and at the file level ("3 sites in AdjustBalanceModal"
  per the old roadmap was actually 1 site). Lesson: pre-flight every
  plan assumption against current files/branches before starting work.
- **Post-squash divergence** — after GitHub squash-merges your PR, your
  local `main` will appear to "diverge" from `origin/main` because the
  new commit has a different SHA than your local feature branch (same
  content, different SHA). DO NOT merge or rebase. Use
  `git fetch && git reset --hard origin/main`. Pre-empt the post-merge
  cleanup hassle by stashing the `next-env.d.ts` phantom first.
- **`next-env.d.ts` phantom** — Next.js touches the mtime of this file on
  every `npm run dev` / `npm run build`, making it appear modified in
  `git status` even though `git diff` shows nothing. Stash and drop
  between merges; never commit.
- **Static-components bug** — when a component is declared inside the
  body of another component's render function, it gets a new function
  reference on every render. React treats it as a new component type
  and unmounts/remounts it. State resets, focus is lost. Fix: pull the
  inner component out to module scope. The Phase 4a target.
- **Stale-closure / use-before-declare** — when a `useEffect` calls a
  function declared further down in the component, the effect captures
  the initial reference and never sees updates. Fix: move the function
  declaration above the `useEffect`, wrap in `useCallback` with correct
  deps, add the function name to the effect's deps array. Auth-context
  and NotificationBell were both this pattern.
- **TDS** — Tax Deducted at Source. Monthly income-tax withholding.
- **SSF** — Social Security Fund. Government-administered retirement scheme.
  Employee contributes 11% of basic salary (in your code), employer 20%.
- **SST** — Social Security Tax. The 1% income tax on the first slab,
  waived for SSF contributors per Section 21(4) of the Financial Act.
- **Effective basic** — `basicSalary − absenceDeduction`. The base your
  backend uses for SSF/PF calculation.
- **Annualization-by-multiplication** — your backend's TDS approach:
  `annualTaxable = monthlyFigure × 12`. Works when salary is constant
  all year, breaks for raises / mid-year hires / Dashain bonus month.

---

## 7. Companion documents

When starting a new session, upload all four:

- **`STATUS.md`** — this file. Historical context.
- **`ROADMAP.md`** — forward-looking plan. Source of truth for "what step are we on."
- **`SECURITY-NOTES.md`** — security analyses worth remembering.
- **`PAYROLL-AUDIT-2026-04-27.md`** — TDS/SSF calculation mechanism + 5 open
  questions for a CA.

If next-Claude is missing context after that, ask it to skim the last 3 PRs
on GitHub before starting — those tell most of the recent story.

---

## 8. Lessons from recent sessions

Patterns worth remembering, because they will repeat:

**1. "Small steps" can turn out big.** Step 6 (frontend lint setup) was
sized at 1 hour and took ~6 hours. The payroll session was a similar
expansion. This session was sized as "Phase 4a — AdjustBalanceModal"
and shipped 3 PRs across 3 files.

The roadmap rule "if a step looks bigger than expected, stop and reassess"
saved us multiple times now. Future steps should be sized with this kind
of surprise in mind.

**2. Production has pilot users.** The temptation to "just push and test in
production" comes up in every session. It's the wrong move every time.
Local seed setup makes verification cheap. Use it. Manual browser
verification is the gate, not lint or build status.

**3. Verify against current repo state, not memory.** Every session bites
on this in some form. This session's flavors: 4 stale origin branches
needed triage before any real work; "3 sites in AdjustBalanceModal" per
the old roadmap was 1 site; local `main` "diverged" from origin after
squash-merges (it didn't — same content, different SHA). Always run
`git log --oneline -10`, `git status`, and `git branch -r` before
planning.

**4. Lint count is not the work.** Fixing real bugs sometimes leaves the
count flat (because chained warnings surface once you fix the outer one).
Real bugs eliminated is the metric. Three real stale-closure bugs were
fixed this session. The lint count says 9 warnings less than session
start; the actual improvement is bigger because the warnings now reflect
real remaining work, not noise.

**5. "What are we trying to fix here exactly?"** When git plumbing or
edge-case-chasing has been going for a while, stopping to re-anchor on
the user-visible behavior is correct. The answer should fit in two
sentences. If it doesn't, the scope drifted and we should narrow down.
