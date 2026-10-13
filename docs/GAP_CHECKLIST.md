# BIKA Platform — Gap checklist (v5.3)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| 1 | Build ignore TypeScript/ESLint | **Mitigated** | CI runs `tsc --noEmit` + lint; `ignoreBuildErrors` kept until legacy TS debt cleared |
| 2 | In-memory rate limit only | **Closed** | Optional Upstash Redis when `UPSTASH_REDIS_REST_URL` + token set |
| 3 | Production deploy drift | **Ops** | Redeploy Hostinger/Vercel from main; verify `/api/health` = 5.3.0 |
| 4 | Missing `/officer/reassign` | **Closed** | Admin reassign UI + assign API |
| 5 | Missing USSD API | **Closed** | `POST /api/ussd` with `USSD_WEBHOOK_SECRET` |
| 6 | No automated tests | **Closed** | `scripts/smoke-reference-id.mjs` + GitHub Actions CI |
| 7 | No error/not-found pages | **Closed** | `app/error.tsx`, `not-found.tsx`, `global-error.tsx` |
| 8 | README/docs stale | **Closed** | README aligned to 5.3 |
| 9 | Attachments client-only | **Already OK** | Supabase Storage `incident-attachments` bucket |
| 10 | Public lookup by ID | **Accepted** | Rate-limited; ticket-ID model |
| 11 | Rating unauthenticated | **Accepted** | One-shot DB guard + rate limit |
| 12 | CSP unsafe-inline | **Accepted** | Required by Next.js App Router without nonces |
| 13 | Service role blast radius | **Documented** | Server-only; RBAC on every privileged route |
| 14 | Demo credentials | **Ops** | Rotate seed passwords before public launch |
| 15 | Duplicate mapIncident | **Closed** | Shared `app/lib/mappers/incident.ts` |
| 16 | Unassigned client-only | **Closed** | `onlyUnassigned=true` on GET `/api/reports` |
| 17 | MEDIUM/LOW no auto-assign | **By design** | Queue Unassigned + reassign cover these |
| 18 | Officer pick non-round-robin | **Closed** | Lowest open-case load among on-duty |
| 19 | Sparse migrations | **Documented** | Tree has `000_reset` + `009`; apply via Supabase |
| 20 | Notifications optional | **OK** | Health reports channel readiness |
| 21 | Cron SLA wiring | **Ops** | Point host cron at `/api/cron/sla-check` |
| 22 | Root redirect vs marketing | **By design** | Main → `/report`; marketing is host-specific |
| 23 | SW cache version | **Closed** | `bika-v53` |
| 24 | Login outside shells | **OK** | Standalone official gate |
| 25 | GPS hardcoded fallback | **Closed** | Soft error; no fake location |
| 26 | My Reports device-local | **By design** | Reference ID is recovery key |
| 27 | No i18n | **Backlog** | Siswati planned post-launch |
| 28 | Command/map GPS quality | **Backlog** | Improves as GPS pins are used |
| 29 | No CI | **Closed** | `.github/workflows/ci.yml` |
| 30 | standalone output | **Documented** | Enable for Hostinger Node if needed |
| 31 | Health version sync | **Closed** | 5.3.0 |
| 32 | Docs vs mobile/USSD | **Closed** | README truthful; USSD API present |
