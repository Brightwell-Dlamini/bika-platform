# BIKA Platform — Gap checklist (v6.0.1)

| # | Gap | Status | Notes |
|---|-----|--------|-------|
| 1 | Build ignore TS/ESLint | **Mitigated** | Legacy UI debt; CI smoke gates pure logic |
| 2 | Rate limit store | **Code ready** | Upstash when `UPSTASH_REDIS_*` set; else memory. Set env for multi-instance. |
| 3 | Prod deploy parity | **Ops** | Health must show **6.0.1** after deploy |
| 4 | Reassign UI | **Closed** | |
| 5 | USSD | **Deferred** | |
| 6 | Automated tests | **Partial** | reference ID + transition smokes |
| 7–9 | error / README / attachments | **Closed** | |
| 15 | Duplicate mappers | **Closed** | |
| 18 | Load-aware pick | **Closed** | |
| 21 | SLA cron | **Closed in code + scheduled** | `vercel.json` every 15m; `CRON_SECRET` required |
| 23 | SW cache | **Closed** | bika-v57+ |
| 30 | Acknowledge race | **Closed** | atomic endpoint |
| 31 | Officer directory scope | **Closed** | |
| 32 | Status graph single source | **Closed** | `lib/statusTransitions.ts` |
| 33 | On-duty toggle | **Closed** | header + dashboard |
| 34 | Citizen track share | **Closed** | success + case header |
| 35 | Notifications | **Code ready** | Set `RESEND_API_KEY` + `NOTIFY_TO_EMAIL` (and optional Twilio) |

**Honest residual:** full TypeScript build strictness, multi-instance Redis without env, i18n, host ops (Upstash + Resend credentials), full E2E suite.
