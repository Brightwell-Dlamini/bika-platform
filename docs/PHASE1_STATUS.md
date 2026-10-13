# Phase 1 Status

**Updated:** 18 August 2026

| Area | Target (Phase 1) | Status |
|------|------------------|--------|
| Frontend | Next.js 15 App Router | **Done** — `next@15.5.23`, React 19 |
| Backend | Supabase (PostgreSQL, Auth, Storage, Realtime) | **Done** — DB, Auth helpers, Storage uploads, Realtime channel |
| Data | Real DB + Row Level Security | **Done** — schema + RLS; run `RESET_AND_SEED.sql` then `002_phase1_auth_storage_rls.sql` |
| Auth | Supabase Auth + role profiles | **Done** — `app/lib/auth.ts`; login prefers Auth, falls back to profile `password_hint` for seeded accounts |
| Uploads | Real storage + attachment records | **Done** — `app/lib/uploads.ts` + `attachment_records` table |
| Live ops | Realtime Command Centre / Dashboard | **Done** — `storage.ts` subscribes to Postgres changes |
| Theme | Dark default + light mode | **Done** — existing ThemeProvider (unchanged UX) |
| PWA | Service worker + install prompt + icons | **Done** — `sw.js`, install banner, `/icons/icon.svg` |
| Deploy | Vercel-ready | **Done** — env vars + Next 15 config |

## Operator steps

1. Run `supabase/RESET_AND_SEED.sql` (if not already).
2. Run `supabase/migrations/002_phase1_auth_storage_rls.sql`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel.
4. Optionally create matching users in **Authentication → Users** for full Auth sessions (email/password matching seed profiles).
5. Deploy.

## Optional: provision Auth users

For each seeded profile email, create a Supabase Auth user with the same password as `password_hint`. Link `profiles.auth_user_id` to `auth.users.id` when ready for stricter RLS in Phase 2.
