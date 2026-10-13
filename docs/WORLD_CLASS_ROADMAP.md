# BIKA world-class roadmap status

Inspired by Snap Send Solve, Singapore OneService, FixMyStreet, SeeClickFix/OpenGov 311, Juvare WebEOC.

## Shipped foundations

| Capability | Module / surface |
|------------|------------------|
| My reports (device shelf) | `app/lib/myReports.ts`, `MyReportsPanel`, wired on public home |
| Post-close service rating (CSAT) | `ResolutionRatingModal`, `citizenServiceRating` on Incident |
| Confirm-before-submit UI | `ConfirmReportSummary` (component ready; Review step on progress bar) |
| Nearby / similar reports UI | `NearbyReportsHint` + soft duplicate gate in portal |
| Officer reply templates | `app/lib/officerTemplates.ts` |
| Crisis / surge mode | `crisisMode.ts`, `CrisisBanner` on shell |
| Regional command KPIs | `commandKpis.ts`, `CommandKpiStrip` |
| System banners (no browser alerts) | `notify.ts`, `SystemBannerHost` |
| Status pipeline + advance | `IncidentDetailsModal` |
| Role queues + SLA filters | `OfficialDashboard` |
| Skip link + main landmark | `layout.tsx`, `page.tsx` `#main-content` |

## Wire-in still recommended in PublicPortal (large file)

1. On form submit → navigate to `confirm` step and render `ConfirmReportSummary` before `saveIncident`
2. Before submit → show `NearbyReportsHint` if geo-proximate open cases exist
3. Photo-first ordering in the details step
4. Keyboard roles on sector selection cards (`role="button"`, Enter/Space)

## Officer / command remaining polish

1. Template chips in `IncidentDetailsModal` message composer
2. One-tap **Acknowledge** on each official queue row
3. Mount `CommandKpiStrip` above the command map
4. Super Admin toggle for `toggleCrisisMode()`
5. SMS/WhatsApp status hooks (backend gateways already configured in system config)

## Design north star

> National OS for transport & trade safety — as easy as Snap Send Solve for citizens, as coordinated as OneService across agencies, as operational as a modern EOC for officials.
