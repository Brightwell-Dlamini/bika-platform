# BIKA Platform — Gap checklist (v5.9)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| 1 | Build ignore TS/ESLint | **Mitigated** | Legacy UI debt; CI smoke gates pure logic |
| 2 | Rate limit store | **Partial** | Upstash when env set; `rateLimitAsync` on submit |
| 3 | Prod deploy parity | **Ops** | Redeploy; health must show **5.9.0** |
| 4 | Reassign UI | **Closed** | |
| 5 | USSD | **Deferred** | |
| 6 | Automated tests | **Partial** | reference ID + transition smokes |
| 7–9 | error / README / attachments | **Closed** | |
| 15 | Duplicate mappers | **Closed** | |
| 18 | Load-aware pick | **Closed** | |
| 21 | SLA cron | **Closed in code** | Host must schedule |
| 23 | SW cache | **Closed** | bika-v57+ |
| 30 | Acknowledge race | **Closed** | atomic endpoint |
| 31 | Officer directory scope | **Closed** | |
| 32 | Status graph single source | **Closed** | `lib/statusTransitions.ts` |
| 33 | On-duty toggle | **Closed** | header + dashboard |
| 34 | Citizen track share | **Closed** | success + case header |

**Honest residual:** full TypeScript build strictness, multi-instance Redis without env, i18n, host ops (deploy/cron/passwords), full E2E suite.
