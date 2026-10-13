# BIKA Platform — Gap checklist (v5.6)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| 1 | Build ignore TS/ESLint | **Mitigated** | Still on for legacy UI debt; CI smoke + transition tests gate pure logic |
| 2 | Rate limit store | **Partial** | Upstash when env set; else memory |
| 3 | Prod deploy parity | **Ops** | Redeploy; health must show 5.6.0 |
| 4 | Reassign UI | **Closed** | |
| 5 | USSD | **Deferred** | |
| 6 | Automated tests | **Partial→improved** | reference ID + transition graph smokes |
| 7 | error/not-found | **Closed** | |
| 8 | README | **Closed** at release | |
| 9 | Attachments | **Closed** | |
| 10–12 | Public ID / rate / CSP | **Accepted** | |
| 13–14 | Service role / seeds | **Ops/docs** | |
| 15 | Duplicate mappers | **Closed** | assign, transition, sla, automation share mapper |
| 16 | Unassigned filter | **Closed** | |
| 17 | MEDIUM/LOW auto-assign | **By design** | |
| 18 | Load-aware pick | **Closed** | |
| 19 | Migrations | **Ops** | Apply via Supabase |
| 20 | Notifications | **Env** | |
| 21 | SLA cron | **Closed in code** | Use `CRON_SECRET`; host must schedule |
| 22 | Root routing | **By design** | |
| 23 | SW cache | **Closed** | bika-v55 |
| 24 | Login | **OK** | |
| 25 | GPS fake fallback | **Closed** | |
| 26 | My Reports local | **By design** | |
| 27 | i18n | **Backlog** | |
| 28 | Map GPS density | **Backlog** | |
| 29 | CI | **Improved** | Dual smoke scripts |
| 30 | Acknowledge race | **Closed** | `POST .../acknowledge` atomic |
| 31 | Officer directory scope | **Closed** | Agency-scoped for non-super-admin |

**Honest residual:** full TypeScript build strictness, multi-instance Redis without env, i18n, host ops (deploy/cron/passwords), full E2E suite.
