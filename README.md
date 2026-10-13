# BIKA Platform

**Kingdom of Eswatini — Nationwide Incident & Logistics Reporting System**

> *See something, say something*  
> *Bona lokutsite, kusho lokutsite*

BIKA is a multi-channel national platform that enables citizens to report transport, food-trade, and public-safety issues and enables Police, Health Inspectors, Rank Marshals, and Super Administrators to manage, assign, escalate, and resolve those cases in real time.

**Live deployment:** [https://bika-eswatini.vercel.app](https://bika-eswatini.vercel.app)  
**Version:** 1.3.0

---

## Platform Overview

| Channel | Technology | Purpose |
|---------|------------|---------|
| Web Application | Next.js 15 (App Router) + React 19 + Tailwind | Full public portal, Command Centre, Official Dashboard, Super Admin Control |
| Progressive Web App | Service Worker + Web App Manifest | Installable offline-capable experience |
| Native Mobile | Expo / React Native | Citizen reporting + Official field operations |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) | Single source of truth with Row Level Security |

---

## Core Capabilities

### For the Public
- Report an Incident, Complaint, Compliment, Rating, or Emergency in under a minute
- Attach photographic evidence (camera or gallery)
- Anonymous reporting option
- Instant BIKA Reference ID generation
- Track report status and history
- Emergency Hotline Directory
- Offline queue (mobile) with automatic sync on reconnect, retry limits, and size guards

### For Officials (Police, Health Inspectors, Rank Marshals)
- Role-filtered work queues (web + mobile)
- Live updates via Supabase Realtime
- Case detail view with evidence, status history, notes, and audit trail
- Assignment, escalation, and resolution workflows
- Rank QR code generation and establishment management

### For Command & Super Admin
- National Command Centre with map and live incident feed
- Analytics & Reports with CSV and printable PDF export
- Full user, role, hotline, logo/branding, and system configuration management
- Audit logging of all significant actions
- System health (`/api/health`) and operational controls

---

## Architecture

```
bika-platform/
├── app/                    # Next.js App Router (web)
│   ├── (auth)/login/       # Authentication
│   ├── api/                # API routes (report, notify, storage, health)
│   ├── components/         # UI components (ported & enhanced from prototype)
│   ├── lib/                # Auth, storage layer, Supabase adapter, logger, exports
│   └── types/              # Shared domain types
├── lib/supabase/           # Supabase client helpers (browser + server)
├── mobile/                 # Expo / React Native application
│   ├── app/                # Screens (report, track, official, case, hotlines, login)
│   └── src/lib/            # API client, offline queue (v2), notifications, types
├── supabase/
│   ├── migrations/         # Schema, auth/storage RLS, ops, observability (001–008)
│   └── RESET_AND_SEED.sql  # Full reset + seed data (dev only)
├── docs/                   # Runbook, checklists, status reports, hosting, USSD
├── public/                 # PWA assets, service worker, icons
└── middleware.ts           # Route protection & security headers
```

---

## Quick Start (Web)

### Prerequisites
- **Node.js 24.x** (Active LTS — required by Vercel; see `.nvmrc`)
- A Supabase project

### 1. Clone and install
```bash
git clone https://github.com/Brightwell-Dlamini/bika-platform.git
cd bika-platform
# If you use nvm:
nvm install
nvm use
npm install
```

### 2. Environment
```bash
cp .env.example .env.local
# Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Server-only: SUPABASE_SERVICE_ROLE_KEY
```

### 3. Database
In the Supabase SQL Editor, for a **new** project:
1. `supabase/RESET_AND_SEED.sql` (destructive — empty/dev only)
2. Migrations in order: `002` → `003` → `004` → `005` → `006` → `007` → **`008_observability_and_indexes.sql`**

For an existing production project, apply only migrations not yet run (especially **006**, **007**, **008**, and when ready **009**).

### 4. Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Mobile Application

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo start
```

See `mobile/README.md` for offline behaviour, large-photo guidance, and EAS build / store submission instructions.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/OPS_RUNBOOK.md](docs/OPS_RUNBOOK.md) | Day-to-day ops: users, backups, retention, incident response |
| [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) | Pre-launch security and smoke tests |
| [docs/HARDENING_NOTES.md](docs/HARDENING_NOTES.md) | Auth, RLS, logging, offline hardening summary |
| [docs/WORK_REPORT.md](docs/WORK_REPORT.md) | Full before/after work report |
| [docs/HOSTING_COST_OUTLOOK.md](docs/HOSTING_COST_OUTLOOK.md) | Hosting stack and cost outlook |
| [docs/USSD.md](docs/USSD.md) | USSD channel reference |

---

## Security Notes

- Public report endpoint rate-limited (in-memory; upgrade to shared store for multi-instance)
- Middleware blocks open signup routes
- Row Level Security enabled; production policies in migrations **006** / **007**
- Anon cannot list full incidents table (track via RPC or `/api/track`)
- Official tools require authenticated roles
- **Demo / seed credentials must be rotated** before public launch; clear `password_hint`
- Set `SUPABASE_SERVICE_ROLE_KEY` server-only on Vercel
- Apply migration **008** for ops indexes and `ops_incident_summary()`
- Health: `GET /api/health` (no secrets)
- **v1.3.0:** Next.js 15.5.27 security patches applied (image SSRF, SSG/ISR cache poisoning)

---

## Technology Stack

- **Runtime:** Node.js 24.x (Active LTS)
- **Frontend:** Next.js 15.5.27, React 19.3, TypeScript, Tailwind CSS, Lucide icons, Motion
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Mobile:** Expo / React Native
- **Deployment:** Vercel (web), EAS (mobile)
- **PWA:** Custom service worker + Web App Manifest

---

## Changelog (recent)

### 1.3.0 (2026-10-12)
- Next.js **15.5.27** (September 2026 security release)
- React / React DOM **^19.3.0**
- Baseline ESLint (`eslint-config-next`)
- Health endpoint version aligned with `package.json`

### 1.2.x
- Production hardening, SLA KPIs, citizen UX batch, observability migration 008

---

## Licence & Ownership

This platform was developed for the Kingdom of Eswatini national reporting initiative. All rights remain with the commissioning party as defined in the engagement agreement.

---

*Built from the original frontend prototype into a production-grade, multi-channel national platform.*
