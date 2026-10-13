# BIKA User Flows & System Logic

How the platform works from a citizen and official perspective (UI and domain logic).

---

## Shell layout

Single-page web app (`app/page.tsx`):

1. **Header** — national strip, online status, **EN | SS language toggle**, theme toggle, Log In / user menu.
2. **Sidebar** (officials only, when not on Public Portal) — Command Centre, Official Dashboard, Fleet, Establishments, Analytics, Super Admin.
3. **Main pane** — one of: Public Portal | Command Centre | Official Dashboard | Fleet | Establishments | Analytics | Super Admin.
4. **Modals** — Login, Incident Details, Logo Editor, Hotline Editor.

Guest users land on **Public Portal**. After login, Super Admin opens **Command Centre**; other officials open **Official Dashboard**.

Language preference (EN/SS) is stored in `localStorage` (`bika_language`) via `app/lib/i18n.tsx`.

---

## Citizen flow (zero login)

Progress UI component: `ReportFlowProgress` — **Sector → Action → Details → Done**. Track is a side path.

### Step 1 — Sector

Choose **Road Transport** or **Restaurant/Food**. Sets default categories and complaint subjects.

### Step 2 — Action

| Action | Default severity | Typical use |
|--------|------------------|-------------|
| Incident | MEDIUM | Speeding, hygiene hazard, unsafe vehicle |
| Complaint | HIGH | Overcharging, misconduct |
| Compliment | MEDIUM | Praise driver/trader |
| Rating | MEDIUM | Star scores + optional review |
| Emergency | CRITICAL, status starts **In Progress** | Life/safety urgency |
| Track | — | Enter existing BIKA reference ID |

### Step 3 — Form

- Region + location (optional GPS).
- Sector-specific fields.
- Photo evidence.
- Optional identity or **anonymous**.
- Soft duplicate detection helpers live in `app/lib/citizenReportLogic.ts` (`findSimilarOpenReport`, `buildCitizenIncident`) for similar open reports within 24h (location / vehicle / restaurant).

### Step 4 — Success

Shows the reference ID. User can open the case modal (track) or return home.

### Track

Enter reference ID → local cache, then `/api/track` fallback → **Incident Details** (public timeline; internal notes hidden).

---

## Official flow

### Official Dashboard

- **My Assigned Cases** — officer ID or department/role match.
- **Regional Feed** — region filter; ordered so Police/Rank Marshal prioritise transport and Health prioritises food/trade.
- Quick BIKA ID search; **Log Official Note** (internal); **Open Case Details**.

### Command Centre

- KPI cards with **live** average first-response and resolution times from incident timestamps.
- Map + filterable list → case modal.

### Case modal

- Public: description, evidence, status, public timeline only.
- Official: status, assign, escalate, public or internal notes, SLA cards.

### Automation (after save)

SLA by severity → entity link → HIGH/CRITICAL auto-assign → receipt/notify as configured.

---

## Status lifecycle

```
Submitted → Received → Verified → Assigned → In Progress → Resolved → Closed
                ↘ Escalated
                ↘ Rejected / Duplicate
Emergency may start at In Progress.
```
