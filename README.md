# BIKA Platform

**Kingdom of Eswatini — Nationwide Incident & Public Safety Reporting**

> *See something, say something*

**Version:** 6.0.0  
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

Health: `GET /api/health` → `6.0.0`

Gap tracker: [docs/GAP_CHECKLIST.md](docs/GAP_CHECKLIST.md)

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local |
| `npm run build` | Production build |
| `npm run test:smoke` | Reference ID + transition graph |
| `npm run lint` | ESLint |

SLA cron: `GET /api/cron/sla-check` with `Authorization: Bearer $CRON_SECRET`

---

*BIKA Platform · Kingdom of Eswatini*
