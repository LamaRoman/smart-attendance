# Smart Attendance — Roadmap (2026-04-27 onwards)

**For:** You (Roman), when you come back and need to know what step we're on.
**Posture:** Cautious. Pilot users in production. No breakages.
**Last updated:** 2026-05-02 (end of React 19 cleanup session — 3 PRs shipped)

**How to use this doc:**
1. Read section 1 (where we are) — 2 minutes
2. Find which step in section 3 is `▶ NEXT`. That's what to start.
3. When a step is done, mark it ✅ in section 4 and update the date.

---

## 1. Where we are right now

### What's done (most recent first)

- ✅ **React 19 cleanup — Phase 4a partial** (2026-05-02, three PRs)
  - **PR #66** — `AdjustBalanceModal`: extracted `Field` to module scope (was static-component bug causing focus loss on every keystroke), plus bonus `onFocus={e => e.target.select()}` UX fix for the awkward zero-prefix behavior. Real user-visible bug, verified in browser.
  - **PR #67** — `auth-context`: wrapped `checkAuth` in `useCallback`, moved declaration above the calling `useEffect`. Fixed the stale-closure / "accessed before declared" warning. Auth tested across 5 paths (refresh, login, logout, multi-tab, change-password). No behavior change.
  - **PR #68** — `NotificationBell`: wrapped `loadUnreadCount` and `loadNotifications` in `useCallback`, moved declarations above their `useEffect`s. Polling interval (30s) verified intact in network tab. Tested as both org-admin and employee.
  - Lint count: 66 → 57. Three real stale-closure bugs fixed.
- ✅ **Two unrelated frontend fixes shipped during/after the payroll session**
  - PR #64 — Dynamic IP resolution for dev API base URL (status: not actually working — deferred for later)
  - PR #65 — QR countdown moved into Expires stat card (working as expected)
- ✅ **Payroll live-preview bug fixes shipped** (PR #63, 2026-04-27)
- ✅ **Frontend lint + Prettier shipped** (PR #61, 2026-04-27)
- ✅ Pentest warnings investigation (PR #47) — XSS + `__proto__` confirmed false positives
- ✅ Email service lazy init (PR #46)
- ✅ Branch protection on `main` (2026-04-26) — 9 CI checks gating, no bypass
- ✅ Cross-org isolation hardened end-to-end (PR #32, #35, #43, #44, #45)
- ✅ Production stability incident recovered (PR #42 — Express 5 sanitize fix)
- ✅ CI typecheck/test gates for backend + frontend (PR #36, #37, #39)
- ✅ `SECURITY-NOTES.md` documents past security analyses

### What's true about your repo right now

- 145 backend tests passing
- 34 cross-org pentest probes running on every PR
- 9 CI checks gating every PR (11 total including 2 Vercel checks)
- Frontend lint passes 0 errors, **57 warnings** (was 66 at start of session)
- Solo developer (you), no collaborators
- Live in production at `api.zentaralabs.com` / `attendance.zentaralabs.com`
- Pilot users actively using it
- ~9 open dependabot PRs in the queue (was 13; some auto-cleaned, some still open — see Step 8)
- Local dev environment is now seedable via `prisma migrate reset` with credentials in `backend/.env`
- No memory of previous sessions on my end — I work from this doc

### What's *not* true (be honest)

- **Frontend has no automated tests.** Only typecheck, build, and lint pass on CI. React logic bugs aren't caught — last session found 2 just by running lint, this session found 3 more (focus loss, stale closures × 2). There are likely more.
- **Mobile app has no CI gates at all.**
- **No production monitoring/alerting** beyond Vercel + Railway dashboards.
- **57 lint warnings** in frontend code (mostly React 19 `set-state-in-effect` cluster + remaining immutability bugs in 3 files) — visible in CI logs, non-blocking. Tracked as Step 4.
- **Payroll calculations have not been validated by a Nepali CA.** Same 5 open questions in `PAYROLL-AUDIT-2026-04-27.md` still pending.
- **3 soft pentest warnings** remain. All harness limitations, not real risks.
- **Dynamic IP resolution for dev (PR #64) doesn't actually work.** You shipped it but the feature is broken in dev. Not on the immediate roadmap, will deal with when it's actually a problem.

These are not on the immediate roadmap below but you should be aware they exist.

---

## 2. How we're going to work

### One step per session

Each step in section 3 is a self-contained piece of work with a clear "done" condition. We do **one** per session unless a step is trivially small. When complete, mark ✅ in section 4. The `▶ NEXT` marker moves to the next actionable `⬜`, skipping deferred items.

### Three types of steps

- **You-only steps** — only you can do (clicking GitHub settings, talking to a CA, deciding tradeoffs)
- **Me-only steps** — I draft, you review and commit
- **Together steps** — back-and-forth iteration

### When in doubt, stop

If a step looks bigger than expected, or surfaces something unexpected (like the seed.ts archaeology, like the payroll session, like the 4-stale-branch cleanup at the start of this session), we stop and reassess. Don't power through. This rule has saved hours three times now.

### Verify before you push

Production has pilot users. Push to a branch, test on Vercel branch preview or local dev, *then* squash-merge. Branch protection prevents direct push to main, which is the safety net.

### Post-squash divergence (new this session)

When you squash-merge a PR on GitHub, your local `main` will appear to "diverge" from `origin/main` because GitHub creates a new commit with a different SHA than your local branch. Do NOT try to merge or rebase — `git fetch && git reset --hard origin/main` is correct. The "lost" local commit is content-identical to the new origin one. See section 6 lessons.

---

## 3. The roadmap (in order)

### ▶ NEXT — Step 1: Take payroll mechanics to a Nepali CA

**Type:** You-only (with my help preparing materials)
**Time:** 30-45 min with the CA, 15 min prep
**Why now:** Payroll is real-money critical. Last session shipped 3 bug fixes that aligned the frontend live preview with the backend, but the backend itself uses some choices that need professional validation. Without this conversation, you're guessing about whether the system is correct under Nepal law.

**The 5 open questions** (full details in `PAYROLL-AUDIT-2026-04-27.md` Section 3):

1. **SST waiver scope.** Code waives the 1% SST only for SSF contributors. Does the waiver also apply to PF, CIT, or Pension fund contributors?
2. **SSF/PF base.** Code uses basic salary only. Should it include DA?
3. **Retirement-fund deduction cap.** Code subtracts SSF+PF+CIT from taxable income with no cap. Nepal law has a 500k or 1/3 cap. Does it bind in practice for your customers?
4. **Annualization method.** Code does `current_month × 12`. Is that acceptable, or do CAs expect projected-annual?
5. **FY cutover process.** When the May/June budget drops new slabs, what's the operational process for updating `tds_slabs` system config?

**What you do:**
1. Print or share `PAYROLL-AUDIT-2026-04-27.md` with the CA before the call
2. Walk them through Section 2 (the mechanism) so they understand what your code does
3. Get answers to the 5 questions in Section 3
4. Save answers in a `PAYROLL-CA-NOTES-<date>.md` file in your repo
5. For each "real bug" identified, file a follow-up step here with concrete scope

**Done when:** All 5 questions have a written, dated answer from a CA. New roadmap entries exist for any code changes the CA flagged.

---

### Step 2: SST waiver scope fix — *depends on Step 1*

**Type:** Me-only, you commit
**Time:** ~30 min
**Why:** If the CA confirms SST should waive for PF / CIT / Pension contributors (not just SSF), then the backend's `firstSlabRate` logic is too narrow. Causes ~5,000/year over-deduction per affected employee.

**Plan:**
- Update `calculateNepalTDS` to accept an `anyRetirementFundEnabled` flag
- Mirror in frontend `calculateTDS`
- Add 4 test cases (PF-only, CIT-only, etc.)
- Verify against new test sheet

**Done when:** PR merged. Test sheet expanded. Documented in audit doc.

**Skip if:** CA confirms current behavior is correct.

---

### Step 3: Single source of truth for TDS calculation

**Type:** Together
**Time:** ~1.5 hours
**Why:** Last session you had two implementations of the slab math (frontend `calculateTDS`, backend `calculateNepalTDS`). They drifted, which caused Bug 1. We aligned them, but they will drift again — future bugs will live in this gap.

**Plan options (decide together):**
- **Option A:** Frontend calls `/api/v1/payroll/preview` for live calculation. One source of truth, but adds an API call to every form change.
- **Option B:** Move slab math into a shared package; both frontend and backend import. No extra API call but more setup.

I'd lean **Option A** for simplicity, but discuss the API-call frequency tradeoff first.

**Done when:** Frontend `liveCalculation` no longer contains slab math. Verified by hand-altering backend slabs and confirming frontend reflects the change without code edits.

---

### Step 4: React 19 migration cleanup — the remaining lint warnings

**Type:** Together (across multiple sessions)
**Time:** 3-5 hours total remaining, split into 2-3 sessions
**Why:** Last session added ESLint and surfaced 66 findings. This session shipped Phase 4a partial — 3 real bugs fixed, count dropped to 57. What remains is mostly the `set-state-in-effect` cluster plus 3 files with the same use-before-declare immutability pattern we already know how to fix.

**Phase 4a remaining (~1.5 hours, mechanical):** Three more files with the immutability/use-before-declare pattern. Same fix shape as auth-context and NotificationBell — `useCallback` + reorder declarations:
- `frontend/src/app/payroll/page.tsx` — 3 sites (`loadSettings`, `loadRecords`, `saveSettings`). Most complex of the three because `saveSettings` reads form state.
- `frontend/src/app/super-admin/plans/page.tsx` — 1 site (`loadPlans`)
- `frontend/src/app/super-admin/subscriptions/page.tsx` — 1 site (`loadSubs`)

**Phase 4b (~2 hr):** The `set-state-in-effect` cluster — 19 sites across the codebase. React 19's stricter rules flag the canonical "fetch on mount" pattern as problematic. Two valid approaches per site:
- Refactor to derive the value or dispatch at render-time (best where it works)
- Document with `// eslint-disable-next-line react-hooks/set-state-in-effect` and a one-line reason (acceptable for canonical patterns like `checkAuth` on mount)

Per-site judgment. Don't do this piecemeal — do it as one consistent pass so the eslint-disable rationale is consistent across files.

**Phase 4c (~1 hr):** Cosmetic — `react/no-unescaped-entities` (mostly auto-fixable, 6 sites), `react-hooks/preserve-manual-memoization` (2 sites in payroll/page.tsx — decide useCallback vs trust React Compiler).

**Phase 4d (~30 min):** Once warning count is 0, flip the relaxed rules in `eslint.config.mjs` from `warn` back to `error` so they can't regress.

**Done when:** `npm run lint` exits 0 with 0 warnings, AND relaxed rules are back to `error`.

**Reality check on the count metric:** Phase 4a (auth-context, NotificationBell) revealed that fixing immutability warnings doesn't always reduce the count — `set-state-in-effect` warnings were chained behind them and surfaced once the immutability fix landed. The work shipped real bug fixes regardless. Don't let a flat lint count discourage progress.

---

### Step 5: gitleaks-action — recheck for v3 in late May

**Type:** Me-only, you commit (when there's something to do)
**Time:** ~10 min in May to recheck; 30-45 min if a replacement is needed
**Status:** ⏸ Deferred to late May 2026 (about 3 weeks out)

**Background:** Original plan was to bump `gitleaks-action@v2` to `@v3` because GitHub deprecates Node 20 actions on June 2. Verified upstream — no v3 exists. Latest is `v2.3.9`. June 2 is a soft warning date, not a break. The real hard deadline is **September 16, 2026** (Node 20 removed from runners).

**What to do:**
1. **Late May 2026 (calendar reminder):** Check `https://github.com/gitleaks/gitleaks-action/releases`. If v3 exists, bump and push. ~10 min.
2. **If still no v3 by then:** Replace before September. Either drop the third-party action and run gitleaks CLI directly in the workflow (~30-45 min), or switch to `DariuszPorowski/github-action-gitleaks` (~30 min).

**Done when:** Either v3 has shipped and the workflow is pinned to it, OR the action has been replaced. Gitleaks check still green on the next PR after the change.

---

### Step 6: Threat model document

**Type:** Together
**Time:** ~1.5 hours
**Why:** A one-pager that says: who would attack this app, what assets they want, what paths they'd take, what stops them. Forces you to know your own system. Useful when you eventually hire a real pentest firm — you give them the threat model, they save half a day.

**Plan:** I draft, you correct, we ship a `THREAT-MODEL.md` to the repo.

**Done when:** Document committed. Reviewed with at least one experienced security person (could be a contractor for an hour).

---

### Step 7: Production observability check

**Type:** You-only audit, I help interpret
**Time:** ~1 hour
**Why:** When the next prod incident happens, you need to *find out* about it. Currently I don't know what your monitoring looks like beyond Vercel + Railway dashboards.

**Plan:**
- Tell me what's currently set up (Sentry? Vercel analytics? Railway alerts? Uptime?)
- I list the gaps
- We pick 1-2 cheap wins (e.g., uptime ping that alerts if `/api/v1/health` 500s for 5 minutes)

**Done when:** At least one alert that would have caught the April 25 sanitize bug within 15 minutes.

---

### Step 8: Triage the open dependabot PRs

**Type:** You decide, I help
**Time:** ~30 min triage; longer if any are merged
**Why:** As of session end, ~9 open dependabot PRs. Most are safe minor bumps. Several are major-version bumps that need attention:
- `prisma 5 → 7` (substantial API migration — own session)
- `tailwind 3 → 4` (rewrite-sized — defer indefinitely)
- `expo-router 6 → 55`, `expo-location 19 → 55` (Expo SDK migration disguised as router/location bumps)
- `actions/upload-artifact 4 → 7` (likely safe)

**Plan:**
- Close major-version PRs (they're own-session work — see Steps 12-14)
- Merge safe minor-patch group bumps after CI green
- Document any that need investigation

**Done when:** All open PRs closed or merged. Major bumps tracked as scheduled steps below.

---

### Step 9: Frontend tests

**Type:** Together (own session)
**Time:** ~3 hours
**Why:** Frontend currently has typecheck, build, and lint. No actual tests of behavior. Lint setup caught real bugs (PR #61, #66, #67, #68) but lint can't catch logic bugs ("the success toast doesn't show after a save"). We need actual tests.

**Plan:** Set up Vitest (lighter than Jest for Next 16). Write 5-10 critical-path tests focusing on payroll, login, attendance flows. CI gate.

**Done when:** Test runner runs in CI on every PR. ≥5 tests covering critical user paths.

---

### Step 10: Mobile CI gate

**Type:** Me-only, you commit
**Time:** ~1 hour
**Why:** Mobile (React Native / Expo) has zero CI checks. A breaking change lands in production via an Expo build with no automated catch.

**Plan:** Minimum viable: typecheck + build CI job that runs on every PR touching `mobile/`. Doesn't need full coverage — just "did it compile."

**Done when:** Mobile typecheck/build runs in CI. Branch protection rule includes it.

---

### Step 11: Org-admin TOTP

**Type:** Together (design first, then implement)
**Time:** 2-3 hours, possibly across two sessions
**Status:** Was originally Step 4 in earlier roadmap; deferred to this position per your decision (smaller items first, TOTP gets fresh attention).
**Why:** Single biggest remaining real-code security gap. Org admins can do everything in their org. A compromised org-admin password compromises everything below.

**Why not earlier:** Adds a state machine to authentication. Bugs lock out real users. We design before we code.

**Phase 11a (~30 min):** Design doc — enrollment flow, login flow, recovery codes, where the secret is stored, opt-in vs forced, what happens to existing sessions when TOTP is enabled.

**Phase 11b (~1.5-2 hr):** Implementation. Schema migration, auth route changes, frontend enrollment UI, frontend login flow update. Tests. PR.

**Done when:** Org admins can enroll, log in with TOTP, use recovery code if device lost. Pentest probe verifies login without code is rejected.

---

### Steps 12-14 (lower priority / scheduled)

- **Step 12:** Prisma 5 → 7 upgrade. Own session, ~2 hours. Schema/query API changes, breaking. Don't merge dependabot's PR blindly.
- **Step 13:** TypeScript 5.9 → 6 upgrade (backend + frontend together). Own session, ~1.5 hours.
- **Step 14:** Tailwind 3 → 4 upgrade. Rewrite-sized. Defer indefinitely until forced.

---

## 4. Status tracker

When a step is done, change ⬜ to ✅ and update the date. The `▶ NEXT` marker moves to the next actionable `⬜`, skipping deferred items.

**Recently completed (since the last roadmap rewrite):**
- ✅ AdjustBalanceModal focus + zero-prefix (PR #66) — 2026-05-02
- ✅ auth-context useCallback fix (PR #67) — 2026-05-02
- ✅ NotificationBell useCallback fix (PR #68) — 2026-05-02
- ✅ Branch protection on main — 2026-04-26
- ✅ email.service.ts boot fix (PR #46) — 2026-04-26
- ✅ Pentest warnings investigation (PR #47 + SECURITY-NOTES.md) — 2026-04-26
- ✅ Frontend lint tooling + 2 React 19 bug fixes (PR #61) — 2026-04-27
- ✅ Payroll live-preview bug fixes (PR #63) — 2026-04-27

**Active queue:**

| # | Step | Status | Done date |
|---|---|---|---|
| 1 | Payroll: take to CA | ⬜ ▶ NEXT | |
| 2 | Payroll: SST waiver scope (depends on 1) | ⬜ | |
| 3 | Payroll: single source of truth | ⬜ | |
| 4 | React 19 migration cleanup | 🔶 partial (4a 60% done) | |
| 5 | gitleaks-action recheck | ⏸ Late May 2026 | |
| 6 | Threat model doc | ⬜ | |
| 7 | Production observability | ⬜ | |
| 8 | Dependabot PR triage | ⬜ | |
| 9 | Frontend tests | ⬜ | |
| 10 | Mobile CI gate | ⬜ | |
| 11 | Org-admin TOTP | ⬜ | |
| 12 | Prisma 5 → 7 | ⬜ | |
| 13 | TypeScript 5.9 → 6 | ⬜ | |
| 14 | Tailwind 3 → 4 | ⬜ | |

---

## 5. How to start a new session

Paste this into a new conversation:

> I'm working through ROADMAP.md for my smart-attendance project. We're on step [N]. [Brief description of what step N is]. Last session ended with [what you remember]. Let's continue.

Plus upload **all four** files:
- `STATUS.md` (historical context)
- `ROADMAP.md` (this file — forward-looking plan)
- `SECURITY-NOTES.md` (security analyses)
- `PAYROLL-AUDIT-2026-04-27.md` (TDS/SSF mechanism + open CA questions)

If next-Claude is missing context after that, ask it to skim the last 3 PRs on GitHub before starting.

---

## 6. Lessons from recent sessions

Patterns worth remembering, because they bite repeatedly:

**1. The "small step" can turn into a real bug-hunt.** Step 6 (lint setup) was sized at 1 hour and took ~6 hours. The payroll session was similar — started as "check 50,000 TDS calculation" and turned into 3 bug fixes plus a comprehensive audit doc. This session started as Phase 4a (~1 hr for AdjustBalanceModal alone) and shipped 3 PRs across 3 files. **Sizing estimates are best-case. Always reserve room.**

**2. Plan-from-memory drift bites repeatedly.** The gitleaks v3 phantom (it doesn't exist), the package.json content phantom (it didn't match disk), and this session: 4 stale origin branches I had to triage before doing anything else, plus a "3 sites in AdjustBalanceModal" claim from the old roadmap that turned out to be 1 site. **Verify assumptions against actual repo state before doing anything substantive.** Run `git log --oneline -10`, `git branch -r`, and a quick file check first.

**3. Post-squash divergence (new this session).** When GitHub squash-merges your PR, it creates a new commit with a different SHA than your local branch. Your local `main` then appears to "diverge" from `origin/main` even though they have identical content. The fix is `git fetch && git reset --hard origin/main`, NOT merge or rebase. Pre-empt the post-merge `gh` cleanup hassle by stashing/dropping the `next-env.d.ts` phantom modification first:
```bash
git stash && git stash drop
git switch main && git pull --ff-only
git branch -d <feature-branch>
```

**4. `next-env.d.ts` is a metadata phantom.** Next.js touches its mtime on every `npm run dev` and `npm run build`. It will appear modified in `git status` but `git diff` shows nothing. Don't commit it. `git stash && git stash drop` between merges.

**5. Lint count is not the right metric for cleanup work.** Sometimes fixing a real bug exposes a chained warning underneath, leaving the count flat. The PR still ships a real fix. Track "real bugs eliminated" not "warnings reduced."

**6. "What are we trying to fix here exactly?"** The mid-session question. When git plumbing has been going for a while and the actual bug is far in the rear-view, stopping to re-anchor on the user-visible behavior is correct. Always answerable in two sentences.

These are useful to mention if you bring future-Claude in — they help calibrate sizing on future steps.

---

## 7. If I get something wrong

This doc is my best read of the situation today. I might have priority order wrong, or be missing something you know about your own product. If at any point a step feels misordered or wrong-shaped, push back. The plan is yours, not mine.
