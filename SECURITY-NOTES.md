# Security Notes

This document records security analyses that aren't tracked anywhere else,
and the reasoning behind decisions that might look strange to future readers
(including future-you).

---

## 2026-04-26 — Pentest warnings reviewed

The HTTP pentest harness (`pentest.sh`) raised two warnings during PR #45's
CI run that needed manual evaluation. Both turned out to be false positives;
the probes have been updated to assert the actual security property
decisively rather than emit a warning.

### XSS via stored `firstName` — false positive

**The probe.** `PUT /users/:id` with `{"firstName": "<script>alert(1)</script>"}`.
Returned 200, and the stored value round-trips intact. The probe warned
"stored as-is (output-context escape elsewhere?)".

**Why it isn't a vulnerability.**

XSS is an **output-context** problem, not an input-context one. The
backend's job is to store user data faithfully; escaping happens wherever
the data is rendered. We verified the relevant render surfaces:

- **Frontend (React/Next.js).** All `firstName`/`lastName` references use
  JSX text-content interpolation (e.g. `{user.firstName}`), which React
  HTML-escapes automatically. There are zero instances of
  `dangerouslySetInnerHTML` across the 72 `.tsx` files in `frontend/src`.
  No user-controlled values are interpolated into `href`, `src`, or other
  URL/attribute contexts. No `innerHTML`, `document.write`, or `eval`
  usage. One historical `document.write` site (the QR print page) was
  already audited and replaced with `createElement` + `textContent` (see
  the comment block at `frontend/src/app/admin/qr/page.tsx:179`).

- **Email templates.** Every interpolation of a user-controlled value
  uses the `h()` helper from `backend/src/lib/email-escape.ts`. The
  helper file's docstring explicitly enumerates the values that must be
  escaped — names, IDs, PINs, org names, notes, reasons.

- **Sanitize middleware.** `backend/src/middleware/sanitize.ts` carries
  a long comment explaining why it does *not* try to strip script tags
  from input — that approach corrupts legitimate data and creates false
  assurance because real attackers bypass it with encodings.

**Conclusion.** The defense is correct: store raw, escape at output.
The pentest probe was too narrow — it flagged "stored raw" as a problem
when "stored raw" is the right behavior. Probe updated to PASS the
round-trip test and rely on code review for output-context coverage.

### `__proto__` pollution via update body — false positive

**The probe.** `PUT /users/:id` with
`{"__proto__":{"role":"SUPER_ADMIN"},"firstName":"Sita"}`. Returned 200.
Probe warned "manual verify role unchanged in DB".

**Why it isn't a vulnerability.** Four independent layers, any of which
alone blocks the attack:

1. **Sanitize middleware** (`backend/src/middleware/sanitize.ts`)
   strips `__proto__`, `constructor`, and `prototype` keys from every
   request body. Registered globally on `server.ts:143`, before any
   route handler runs.
2. **Zod schema** (`updateUserSchema`) defines a closed set of allowed
   fields. Even if `__proto__` slipped through, Zod's default `strip`
   mode drops unknown keys.
3. **Role enum** in the schema is `['ORG_ADMIN', 'ORG_ACCOUNTANT',
   'EMPLOYEE']`. `SUPER_ADMIN` isn't an accepted value at the input
   layer at all.
4. **Service layer** has permission gating — already verified by
   `pentest.sh` Section 2 ("Employee self-role-escalation blocked").

**Conclusion.** Defense in depth done right. Probe updated to re-fetch
the user after the PUT and assert `role: "EMPLOYEE"` is unchanged,
turning a hand-wavy WARN into a real PASS/FAIL gate.

---

## How to add to this file

When a security question gets analyzed and the answer is non-obvious or
worth remembering, add a dated section here with: the question, the
analysis, the conclusion. Future security audits (yours, or an external
firm's) will skim this first.

Don't put credentials, secrets, or specific exploitation steps in this
file. It's tracked in git and visible in the public repo.
