# BIKA Production Checklist — Pre-launch (production day)

Complete every item before announcing public availability.

**Target version:** 6.0.1+  
**Primary guide:** [GO_LIVE.md](./GO_LIVE.md)

## 1. Critical security (must complete)

- [x] Removed public **password directory** from login UI (LoginModal + `/login`)
- [x] Removed `password_hint` client-side login fallback (Supabase Auth only)
- [x] Secured `POST /api/admin/create-user` (Super Admin Bearer + service role)
- [x] Stopped writing plaintext passwords into `profiles.password_hint`
- [x] Added CSP and tighter security headers in middleware
- [x] Build fails on TypeScript errors (`ignoreBuildErrors: false`)
- [x] Structured logging on health, report, track, USSD paths
- [x] Mobile offline queue retry limits, size guards, conflict-safe upsert
- [x] USSD requires `USSD_WEBHOOK_SECRET` in production
- [ ] Run SQL migrations through **`009_production_go_live.sql`** in Supabase SQL Editor
- [ ] Provision **real Supabase Auth users** for every official (not seed password_hint)
- [ ] Rotate all seed passwords; confirm `password_hint` column is empty
- [x] Set `SUPABASE_SERVICE_ROLE_KEY` on Vercel (server-only, never `NEXT_PUBLIC_`)
- [x] Set `CRON_SECRET` on Vercel (protects SLA cron)
- [ ] Set `USSD_WEBHOOK_SECRET` if USSD is live
- [ ] Confirm no demo credentials appear in UI, docs shared externally, or working Auth passwords

## 2. Environment (Vercel + Supabase)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for admin/automation | Server only |
| `CRON_SECRET` | Yes for SLA cron | Bearer for `/api/cron/sla-check` |
| `USSD_WEBHOOK_SECRET` | Yes if USSD public | Gateway auth |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | Recommended | Shared rate limits |
| `RESEND_API_KEY` / `NOTIFY_*` | Recommended | Email alerts |
| `TWILIO_*` | Optional | SMS alerts |

## 3. Database order

1. `RESET_AND_SEED.sql` only on **empty/dev** projects (destructive)
2. `002` → `003` → `004` → `005` → `006` → `007` → `008` → **`009`**
3. Verify: `SELECT count(*) FROM profiles WHERE password_hint IS NOT NULL;` → **0**
4. Optional KPI check: `SELECT * FROM public.ops_incident_summary();`

## 4. Auth users

For each official:

1. Super Admin creates user via UI (calls secured `/api/admin/create-user` with session JWT), **or**
2. Supabase Dashboard → Authentication → Add user → then link `profiles.auth_user_id`

Ensure `profiles.auth_user_id` matches `auth.users.id` so RLS policies apply.

## 5. Smoke tests (production URL)

See **GO_LIVE.md Phase D** for the full table. Minimum:

- [ ] Public report submit + reference ID
- [ ] Track by reference (no PII leak)
- [ ] Super Admin login + official status update
- [ ] Unauthorized admin API → 401/403
- [ ] `/api/health` → `ok`, version `6.0.1+`, `cronSecretConfigured: true`

## 6. Operational

- [x] Vercel Cron scheduled (`vercel.json` → every 15 minutes)
- [ ] Supabase Pro backups enabled (or documented export cadence)
- [ ] Vercel production domain + HTTPS
- [ ] Ministry contacts in offline runbook
- [ ] Hotline numbers verified against national services
- [ ] Log retention / search process agreed
- [ ] Upstash Redis for multi-instance rate limiting (optional but recommended)
- [ ] Resend (or webhook) for officer/SLA email alerts

## 7. Known residual (acceptable short-term)

- In-memory rate limit remains until Upstash env vars are set
- Mobile store listings need Apple/Google accounts (web/PWA can launch first)
- Client storage layer still caches for UX; authoritative writes go through Supabase / admin APIs

---

**Verdict:** Ready for **controlled national launch** once GO_LIVE Phases A–E are complete and notification + Redis env vars are configured.
