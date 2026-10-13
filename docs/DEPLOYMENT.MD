# BIKA v2 — Deployment Runbook

**Platform:** BIKA — Eswatini Integrated Real-Time Incident, Transport & Trade Reporting
**Version:** 2.0.0
**Stack:** Next.js 15 · Supabase (Postgres + Auth + Storage) · TanStack Query · Tailwind

---

## 0. Prerequisites

- Node.js **20 or newer** (22 recommended)
- A Supabase project (free tier is sufficient to start)
- One of: Vercel account, or a VPS/Hostinger with Node hosting

---

## 1. Supabase setup

### 1.1 Create the project

1. Go to https://supabase.com/dashboard → New project
2. Choose a region close to Eswatini (Europe West or South Africa if available)
3. Save the **database password** — you won't see it again
4. Wait for provisioning (~2 min)

### 1.2 Copy the connection details

From **Project Settings → API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ never expose client-side)

### 1.3 Run the schema migrations

In **SQL Editor**, run these files in order:

1. `sql/000_reset.sql`
2. `sql/000b_add_admin_role.sql`
3. `sql/000c_seed_admin.sql`

After running, verify:

```sql
SELECT unnest(enum_range(NULL::user_role));
-- Expected: super_admin, admin, police, health_inspector, rank_marshal, public

SELECT COUNT(*) FROM agencies;    -- 7
SELECT COUNT(*) FROM profiles;    -- 5
SELECT COUNT(*) FROM hotlines;    -- 6
SELECT COUNT(*) FROM system_logos; -- 4
