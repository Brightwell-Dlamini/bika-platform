# BIKA Go-Live Guide — Controlled National Launch

Use this document on launch day. Complete every **must** item before announcing public availability.

**Target version:** 1.2.1+  
**Live URL:** https://bika-eswatini.vercel.app  
**Health:** `GET /api/health` → `status: "ok"`

---

## Current automated status (as of last health check)

| Check | Status |
|-------|--------|
| Web deploy + HTTPS | Live on Vercel |
| Supabase public config | Configured |
| Service role on server | Configured |
| Security headers (CSP, HSTS, frame deny) | Present |
| Signup blocked | Redirects to `/login` |
| Admin API without auth | 401 |
| Login UI demo directory | Removed |
| USSD webhook secret | **Not set** (set before public USSD) |
| Email/SMS notifications | Optional (not required for launch) |

---

## Phase A — Database (must)

In **Supabase → SQL Editor**, run any migrations not yet applied, in order:

1. `006_production_rls.sql`
2. `007_link_auth_and_admin_writes.sql`
3. `008_observability_and_indexes.sql`
4. **`009_production_go_live.sql`** (clears `password_hint`, storage policies, ensures `track_incident`)

Verify:

```sql
-- Must return 0
SELECT count(*) FROM public.profiles WHERE password_hint IS NOT NULL;

-- Should return a row of zeros/counts without error
SELECT * FROM public.ops_incident_summary();

-- Track RPC exists
SELECT public.track_incident('nonexistent');
```

---

## Phase B — Real accounts (must)

1. Create **at least one** Super Admin via Supabase Auth (Dashboard → Authentication → Add user) **or** temporarily use existing seed profile only after linking `auth_user_id`.
2. Prefer: sign in as Super Admin → Super Admin Control → create each official with a **unique strong password** (min 8 chars).
3. Confirm each official can sign in on https://bika-eswatini.vercel.app/login
4. **Rotate** any password that ever appeared in seed SQL (`Bika2026Admin!`, `Police2026!`, etc.). Those strings must never remain valid in production Auth.
5. Optionally deactivate unused seed profile rows (see commented block in migration 009).

---

## Phase C — Environment (must / recommended)

| Variable | Must? | Action |
|----------|-------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Already set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Already set (verify still present after any key rotation) |
| `USSD_WEBHOOK_SECRET` | Yes if USSD public | Generate a long random secret; configure the same value on the telco gateway |
| `RESEND_*` / `TWILIO_*` | No | Enable when ministry wants SMS/email alerts |

After changing env vars: **Redeploy** Vercel production.

---

## Phase D — Smoke tests (must)

Run against the production URL:

| # | Test | Expected |
|---|------|----------|
| 1 | Open public portal | Loads; can start a report |
| 2 | Submit a test incident with photo | Reference ID returned |
| 3 | Track that reference in UI or `/api/track?id=...` | Status visible; no reporter phone/email |
| 4 | Login as Super Admin | Success; Command Centre accessible |
| 5 | Assign / change status on test incident | Updates; appears in queue |
| 6 | Create one official user | User can log in |
| 7 | `POST /api/admin/create-user` without Bearer | 401/403 |
| 8 | Visit `/signup` | Redirect to login |
| 9 | `GET /api/health` | `status: ok`, `serviceRoleConfigured: true` |
| 10 | Mobile (if releasing app): offline report → reconnect | Queue flushes |

Delete or close the test incident after checks.

---

## Phase E — Operations (must for sustained run)

- [ ] Supabase **Pro** backups enabled, or weekly export procedure agreed
- [ ] Ministry ICT contacts recorded offline (not only in this repo)
- [ ] Hotline numbers verified against national services
- [ ] Vercel log access assigned to ICT (filter `"service":"bika-platform"`)
- [ ] Share `docs/OPS_RUNBOOK.md` with Super Admins

---

## Phase F — Optional on day one

- Native mobile store submission (EAS) — web + PWA can launch first
- Email/SMS notification keys
- Custom domain (e.g. `bika.gov.sz`) pointed to Vercel
- Upstash Redis for global rate limits (in-memory limit is acceptable for initial load)

---

## Go / No-Go

**GO** when:

- Migrations through **009** applied
- Zero `password_hint` values
- At least one real Super Admin Auth account works
- Smoke tests 1–9 pass
- Seed passwords no longer work

**NO-GO** if:

- Anyone can list all incidents as anonymous
- Demo passwords still authenticate
- `/api/health` is degraded
- Service role key is missing or exposed as `NEXT_PUBLIC_*`

---

## Post-launch first 48 hours

1. Monitor `/api/health` and Vercel error rate.
2. Watch open CRITICAL/HIGH counts in Command Centre.
3. Confirm public reports appear within seconds (Realtime).
4. Do not run `RESET_AND_SEED.sql` on production.

---

*When Phases A–E are complete, the platform is ready for controlled release to real users.*
