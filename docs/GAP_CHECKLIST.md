# BIKA Platform — Gap checklist (honest, v5.5)

Last audited against `main` at platform version **5.5.0**.

## Status legend
- **Closed** — implemented and used in the main flow
- **Partial** — code exists but incomplete or still duplicated
- **Ops** — cannot close in git alone (deploy, secrets, host cron)
- **Accepted** — intentional product/security tradeoff
- **Open** — still a real gap
- **Deferred** — postponed by product decision

| # | Gap | Status | Reality check |
|---|-----|--------|---------------|
| 1 | `ignoreBuildErrors` / ESLint during build | **Open** | `next.config.js` still ignores TS + ESLint on build. CI runs smoke only; `next lint \|\| true` never fails the job. |
| 2 | Shared rate limit store | **Partial** | Upstash path exists; without env vars each Node process has its own memory map. |
| 3 | Production = `main` | **Ops** | Must redeploy and confirm `/api/health` version. Drift is operational, not code. |
| 4 | `/officer/reassign` | **Closed** | Page + assign API exist. |
| 5 | USSD | **Deferred** | Route exists; channel not product focus. |
| 6 | Automated tests | **Partial** | One smoke script for reference IDs. No API/E2E tests. |
| 7 | error / not-found pages | **Closed** | Present. |
| 8 | README version drift | **Partial** | README may lag package/health; check after each release. |
| 9 | Attachments | **Closed** | Browser → Supabase Storage. |
| 10 | Public track by ID | **Accepted** | Rate-limited lookup; ticket model. |
| 11 | Unauthenticated rating | **Accepted** | One rating per case in DB + rate limit. Anyone with ID can rate once. |
| 12 | CSP `unsafe-inline` | **Accepted** | Needed without nonces. |
| 13 | Service role usage | **Documented** | Server-only; privileged routes check caller. |
| 14 | Demo / seed passwords | **Ops** | Rotate before public launch. |
| 15 | Duplicate `mapIncident` | **Partial** | Shared mapper used on list/detail; **transition + assign still had local copies** (transition fixed in 5.5.1). |
| 16 | Unassigned filter | **Closed** | Server `onlyUnassigned=true`; queue uses it. |
| 17 | MEDIUM/LOW no auto-assign | **By design** | Only CRITICAL/HIGH auto-assign. |
| 18 | Officer load balancing | **Closed** | Automation picks lowest open caseload in candidate pool. |
| 19 | Migrations inventory | **Partial** | Sparse SQL tree; must be applied carefully in Supabase. |
| 20 | Notifications | **Partial** | Work only if Resend/Twilio/webhook env set. |
| 21 | SLA cron | **Ops** | Host must hit `/api/cron/sla-check`. |
| 22 | Root vs marketing | **By design** | App root → public report flow. |
| 23 | Service worker cache id | **Closed** | Bumped to match release (`bika-v55`). |
| 24 | Login shell | **OK** | Standalone. |
| 25 | Fake GPS fallback | **Closed** | Toast on failure; no invented place name. |
| 26 | My Reports local-only | **By design** | Reference ID is the recovery key. |
| 27 | i18n / Siswati | **Open / backlog** | |
| 28 | Map GPS coverage | **Open / backlog** | |
| 29 | CI quality gate | **Partial** | Smoke yes; lint non-blocking; no `tsc --noEmit`. |
| 30 | `output: 'standalone'` | **Documented** | Commented for Hostinger when needed. |
| 31 | Health version sync | **Closed** when package + health match (currently 5.5.x). |

## End-to-end flow audit (logic)

```
Citizen:  /report → sector → type → details → review → POST /api/reports
          → success (rememberReport) → /r/[id] track → optional rate when resolved
Officer:  /login → /officer → queue (all|mine|unassigned|overdue)
          → claim/acknowledge → case → transition/notes → resolve
Admin:    reassign UI + admin users/hotlines/system
```

### Flow checks that pass
- Submit validates with Zod client + server; rate limited.
- Track uses GET `/api/reports/[id]`; public callers get PII stripped + public events only.
- Transition graph is enforced server-side (`ALLOWED` map); Acknowledge uses `submitted|triaged|assigned → in_progress` which is allowed.
- Queue Unassigned hits server filter (not only client filter).
- Citizen rating body is a plain object for `apiFetch` (no double stringify).

### Remaining logic risks
1. **Acknowledge race**: claim + transition are two sequential POSTs; if second fails, case may be assigned but still not `in_progress`.
2. **Anyone with a reference ID** can rate once after resolve (by design, not token-gated).
3. **Officer list for reassign** returns all active profiles; no agency scoping on the directory call.
4. **Build can ship with type errors** while `ignoreBuildErrors: true`.
5. **Deploy/cache**: old SW or host not on latest `main` still looks like “gaps” in production.

## Do not claim “all gaps closed”
Code-side product gaps that still matter: strict builds, real test suite, notification/env readiness, migration hygiene, i18n. Ops gaps: deploy parity, secrets, cron, password rotation.
