# BIKA Platform

**Kingdom of Eswatini — Nationwide Incident & Public Safety Reporting**

> *See something, say something*

**Version:** 5.3.0  
**Stack:** Next.js 15 · React 19 · Supabase · Tailwind

---

## What it does

| Audience | Capabilities |
|----------|----------------|
| **Citizens** | Report (transport / food-trade), attach photos, track by BIKA ID, rate resolved cases |
| **Officers** | Queue, acknowledge, assign, notes, SLA awareness |
| **Admins** | Reassign, command centre, analytics, users, hotlines, system config |

Channels: **Web / PWA**, **USSD** (`POST /api/ussd` with `USSD_WEBHOOK_SECRET`).

---

## Quick start

```bash
nvm use   # Node 24.x
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_SUPABASE_*, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Database: apply SQL under `supabase/` (`000_reset.sql` for empty/dev only; `009_production_go_live.sql` for prod deltas).

Health: `GET /api/health` → version `5.3.0`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local server |
| `npm run build` | Production build |
| `npm run test:smoke` | Reference ID smoke tests |
| `npm run lint` | ESLint |

CI: `.github/workflows/ci.yml` on push/PR to `main`.

---

## Ops notes

- **Rate limits:** in-memory by default; set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for multi-instance.
- **Attachments:** Supabase Storage bucket `incident-attachments`.
- **Deploy:** point production host at `main`; confirm health version after each release.
- **Gap tracker:** [docs/GAP_CHECKLIST.md](docs/GAP_CHECKLIST.md)

---

## Security

- Middleware: no public signup, CSP + HSTS, legacy redirects
- Report POST / public lookup / rate / USSD rate-limited
- Service role server-only; RBAC helpers in `app/lib/rbac.ts`
- Rotate any seed/demo credentials before public launch

---

*BIKA Platform · Kingdom of Eswatini national reporting initiative*
