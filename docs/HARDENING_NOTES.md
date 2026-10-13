# Hardening notes (UI unchanged)

Implemented without changing layout/CSS:

1. **Session restore** — on load, restores Super Admin/officer from Supabase Auth session when present.
2. **Logout** — calls `supabase.auth.signOut()`.
3. **Stronger incident IDs** — includes time + random segment to reduce collisions.
4. **Server automation** — `POST /api/automation/incident` after save (SLA, link, assign, events, receipt).
5. **Admin create user** — `POST /api/admin/create-user` provisions Auth + profile when `SUPABASE_SERVICE_ROLE_KEY` is set.
6. **Public track API** — `GET /api/track?id=BIKA-...` + SQL `track_incident` RPC.
7. **Login** — password directory and `password_hint` fallback removed; Supabase Auth only.
8. **No default passwords** — new officials require an explicit password (min 8 chars); never auto-apply a seed password.
9. **Anon incident reads** — full table SELECT denied for `anon`; tracking uses RPC or `/api/track` only (migration 006).
10. **Structured logging** — `app/lib/logger.ts` JSON lines on health/report (and extensible to other routes).
11. **Health endpoint** — version, uptime, config presence checks; no secrets.
12. **Ops indexes + KPI function** — migration `008_observability_and_indexes.sql`.
13. **Mobile offline hardening** — retry limits, queue cap, attachment size guard, conflict-safe upsert (v2 queue key).

## Required env

```
SUPABASE_SERVICE_ROLE_KEY=...   # server only — never NEXT_PUBLIC_
```

## SQL

Run in order through `supabase/migrations/008_observability_and_indexes.sql` (includes prior hardening).
