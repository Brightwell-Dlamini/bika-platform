# BIKA Operating Layer

Built on top of Phases 1–3 to turn reporting into an operating system.

## Pipeline on every incident save

1. **SLA clock** — CRITICAL 2h · HIGH 8h · MEDIUM 24h · LOW 72h (`sla_due_at`)
2. **Entity link** — match `vehicle_registration` → fleet; restaurant name → establishments
3. **Duty routing** — CRITICAL/HIGH unassigned cases auto-assign to on-duty officer in region (role by category)
4. **Domain event** — `incident.submitted` / `incident.updated` / `incident.auto_assigned` / `incident.citizen_receipt`
5. **Citizen receipt** — SMS/email/webhook when non-anonymous contact provided (`POST /api/receipt`)
6. **Officer notify** — existing `/api/notify` for CRITICAL/HIGH

## SQL

```text
supabase/migrations/004_operating_system.sql
```

## Code

- `app/lib/automation.ts` — orchestration
- Wired from `saveIncident` in `app/lib/storage.ts`
- Mobile emergency fork on report screen

## Duty officers

Set `profiles.on_duty = true` for officers who should receive auto-assignment.
