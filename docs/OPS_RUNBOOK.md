# BIKA Operations Runbook

For Super Admins and ministry ICT — no developer required for day-to-day operations.

**Platform version:** 1.2.0+  
**Live web:** https://bika-eswatini.vercel.app

---

## 1. Daily operations

| Task | Where |
|------|--------|
| Review open / critical incidents | Command Centre |
| Assign officers & update status | Incident detail modal |
| Manage users (create / deactivate) | Super Admin Control |
| Edit emergency hotlines | Hotline editor |
| Update national logos / branding | Logo editor |
| System timeouts & escalation rules | Super Admin → System Config |
| Export reports | Analytics → Export CSV / PDF |
| Health check | `GET /api/health` |

---

## 2. User provisioning

### Preferred path (in-app)
1. Sign in as **Super Admin** (Supabase Auth only).
2. Open **Super Admin Control** → Users.
3. Create official with role (`Police`, `Health Inspector`, `Rank Marshal`, or `Super Admin`), region, and a strong password (minimum 8 characters).
4. The UI calls `POST /api/admin/create-user` (Bearer session + server service role) which provisions both Auth and `profiles`.

### Dashboard path (fallback)
1. Supabase → Authentication → Add user (email + password).
2. Ensure a matching row exists in `public.profiles` with the same email and `auth_user_id` set to `auth.users.id`.
3. Run linking if needed (migration 007 already contains the email-link update):
   ```sql
   UPDATE public.profiles p
   SET auth_user_id = u.id
   FROM auth.users u
   WHERE lower(p.email) = lower(u.email)
     AND (p.auth_user_id IS NULL OR p.auth_user_id IS DISTINCT FROM u.id);
   ```

### Deactivation
- Set `profiles.active = false` via Super Admin UI. Deactivated users fail official RLS write paths.

### Password rotation
- Super Admin: use Supabase Auth password reset or Dashboard.
- Never store plaintext passwords or `password_hint` values.

---

## 3. Database backup and restore

### Automated (recommended)
- Supabase **Pro**: Project → Database → Backups. Enable daily backups and retain at least 7 days.

### Manual export
1. Supabase SQL Editor or Table Editor → export critical tables (`incidents`, `profiles`, `fleet`, `establishments`, `hotlines`, `system_config`, `audit_logs`).
2. In-app JSON snapshot (where exposed under Super Admin tools) for offline archival by ICT.

### Recommended cadence
| Cadence | Method |
|---------|--------|
| Daily | Supabase automated backups |
| Weekly | Offline JSON/CSV export stored by ICT |
| Pre-major-change | Full export + note migration version applied |

### Restore notes
- Prefer point-in-time restore from Supabase backups.
- `RESET_AND_SEED.sql` is **destructive** — use only on empty/dev projects, never on production with live citizen data.
- After restore, re-apply migrations from the last known good version if schema drifted.

---

## 4. Data retention

| Data | Guidance |
|------|----------|
| Open / active incidents | Retain until resolved + ministry policy |
| Closed incidents | Retain minimum 24 months for audit (adjust per national policy) |
| Audit logs | Retain minimum 24 months |
| Attachments (Storage) | Align with incident retention; purge orphans periodically |
| Auth sessions | Supabase default; enforce `sessionTimeoutMins` in system config |

Document any legal hold requirements with the ministry legal/compliance office before bulk deletion.

---

## 5. Notifications

Configure on Vercel (optional):

```env
NOTIFY_WEBHOOK_URL=
RESEND_API_KEY=
NOTIFY_FROM_EMAIL=
NOTIFY_TO_EMAIL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM=
NOTIFY_SMS_TO=
```

- **CRITICAL / HIGH** incidents trigger `/api/notify` on save.
- Without keys, events are logged only (safe for staging).

---

## 6. Rate limits and observability

- Public report endpoint: **8 requests / minute / IP** (`/api/report`).
- Structured JSON logs are emitted from health, report, and other instrumented routes (search Vercel logs for `"service":"bika-platform"`).
- `GET /api/health` returns configuration readiness (no secrets).
- Optional SQL KPI helper: `SELECT * FROM public.ops_incident_summary();` (migration 008; Super Admin / service role).

For multi-instance rate limiting, migrate the in-memory map to Upstash Redis (see PRODUCTION_CHECKLIST).

---

## 7. Security checklist (ongoing)

- [ ] Supabase env vars set (URL + anon key + **service role** server-only)
- [ ] Migrations through **008** applied
- [ ] `SELECT count(*) FROM profiles WHERE password_hint IS NOT NULL;` → **0**
- [ ] No public `/signup` (middleware redirects to `/login`)
- [ ] All officials use unique Auth passwords; no shared demo accounts in production
- [ ] `USSD_WEBHOOK_SECRET` set if USSD is public
- [ ] RLS policies from 006/007 remain in force

---

## 8. Incident response (platform outage)

1. Check [status.supabase.com](https://status.supabase.com) and Vercel status.
2. Hit `GET /api/health` — if `status` is `degraded`, verify env vars were not rotated.
3. Browser console / Vercel logs → search for `[BIKA` or `"service":"bika-platform"`.
4. Confirm Supabase Auth and Database are reachable from the project region.
5. Do **not** re-run `RESET_AND_SEED.sql` on production unless data loss is confirmed and authorised.
6. Escalate to platform vendor / ICT lead with request id (if present in API error bodies).

### Suspected security incident
1. Rotate Supabase service role and anon keys if leaked.
2. Invalidate sessions (Auth → users → force logout / password reset for affected accounts).
3. Review `audit_logs` and Vercel access logs for the window of exposure.
4. Disable public report path temporarily via Vercel middleware or feature flag if required.

---

## 9. Contacts

Maintain ministry ICT and vendor contacts offline. This file is not a substitute for national emergency numbers in the Hotline Directory.
