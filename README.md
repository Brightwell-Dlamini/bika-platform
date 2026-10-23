# BIKA Platform

**Kingdom of Eswatini — Nationwide Incident & Public Safety Reporting**

> *See something, say something*

**Version:** 6.0.1  
**Stack:** Next.js 15 · React 19 · Supabase · Tailwind

---

## What it does

| Audience | Capabilities |
|----------|----------------|
| **Citizens** | Report, attach photos, track by BIKA ID, rate resolved cases |
| **Officers** | Queue, atomic acknowledge, on-duty toggle, notes, SLA |
| **Admins** | Reassign, command centre, users, hotlines, system |

---

## Quick start

```bash
nvm use   # Node 24.x
npm install
cp .env.example .env.local
npm run dev
```

Health: `GET /api/health` → `6.0.1`

Gap tracker: [docs/GAP_CHECKLIST.md](docs/GAP_CHECKLIST.md)

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local |
| `npm run build` | Production build |
| `npm run test:smoke` | Reference ID + transition graph |
| `npm run lint` | ESLint |

SLA cron: scheduled every 15 minutes via `vercel.json` → `GET /api/cron/sla-check`  
Auth: `Authorization: Bearer $CRON_SECRET`

---

## Production ops (immediate)

1. **CRON_SECRET** — set on Vercel (protects SLA job)
2. **Upstash Redis** (optional but recommended) — `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for multi-instance rate limits
3. **Email alerts** (optional) — `RESEND_API_KEY` + `NOTIFY_TO_EMAIL` (+ optional `NOTIFY_FROM_EMAIL`)

See [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md).

---

*BIKA Platform · Kingdom of Eswatini*
