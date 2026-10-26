# BIKA Platform

**Kingdom of Eswatini — Nationwide Incident & Public Safety Reporting**

> *See something, say something*

**Version:** 6.1.0  
**Status:** Production-ready for real-world rollout  
**Stack:** Next.js 15 · React 19 · Supabase · Tailwind · Vercel

---

## What it does

| Audience | Capabilities |
|----------|----------------|
| **Citizens** | Report (web + PWA), attach photos, track by BIKA ID, rate resolved cases |
| **Officers** | Queue, atomic acknowledge, on-duty toggle, notes, SLA |
| **Admins** | Reassign, command centre, users, hotlines, system, analytics |

Theme is **dark-only** for launch stability.

---

## Production readiness

BIKA 6.1.0 is ready for controlled national launch and real users:

- Public report → reference ID → track (no PII leak)
- Supabase Auth only (no password directory / seed-hint login)
- RBAC, RLS-backed APIs, rate limiting, CSP + security headers
- SLA monitor cron every 15 minutes (`CRON_SECRET`)
- Structured logging, health probe, automation on submit
- Officer queue, command centre, admin users/hotlines/system

**Ops you still own on day one**

1. Confirm production env on Vercel (`NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`)
2. Apply `supabase/migrations/009_production_go_live.sql` if not already applied
3. Provision real official Auth accounts; rotate any historical seed passwords
4. Smoke: report → track → official login → status update → `GET /api/health`

Optional: Upstash Redis, Resend/Twilio, custom domain, USSD secret when the channel goes live.

---

## Quick start (local)

```bash
nvm use   # Node 24.x
npm install
cp .env.example .env.local
npm run dev
```

Health: `GET /api/health` → version `6.1.0`

```bash
npm run build
npm run test:smoke
npm run lint
```

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run test:smoke` | Reference ID + transition graph |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |

SLA cron: `vercel.json` → `*/15 * * * *` → `GET /api/cron/sla-check`  
Auth: `Authorization: Bearer $CRON_SECRET`

---

*BIKA Platform · Kingdom of Eswatini · Ready for real users*
