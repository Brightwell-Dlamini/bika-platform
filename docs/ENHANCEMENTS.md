# BIKA Platform Enhancements — August 2026

UX, logic, and operational upgrades focused on citizen reporting flow and officer command workflows.

## Changes shipped

### Citizen flow & UI
| Area | Change | Benefit |
|------|--------|--------|
| **Report progress** | `ReportFlowProgress` stepper on portal | Clear sector → action → details → review → done path |
| **Confirm before submit** | `ConfirmReportSummary` wired as Review step | Citizens verify details before final transmission |
| **Duplicate soft-gate** | `citizenReportLogic` + portal banner | Suggest tracking similar open case before new submit |
| **Severity control** | LOW–CRITICAL on Incident/Complaint form | Citizens set urgency intentionally |
| **Copy reference ID** | Success screen clipboard action | Fewer lost tracking IDs |
| **Language toggle** | EN/SS in header + localStorage | Preference survives refresh |
| **Map pins** | Region centroids when no GPS | Reports still visible on national map |
| **Sector card a11y** | Keyboard activation + ARIA roles | Keyboard and assistive-tech users can select sectors |
| **My reports empty state** | Clearer guidance + tip | Reduces confusion for first-time reporters |
| **Skip-to-content + footer** | Landmark and institutional footer | Accessibility and trust |

### Officer / Command
| Area | Change | Benefit |
|------|--------|--------|
| **Status pipeline** | Case modal lifecycle strip | Instant “where is this case?” context |
| **SLA overdue** | Dashboard KPI + list badges + Command Centre | Prioritise late response work |
| **Command Centre filters** | Status dropdown + clear filters + priority sort | Faster triage of live feed |
| **Role-aware feed** | Official dashboard prioritises domain + SLA | Police vs Health Inspector relevance |

### Platform
| Area | Change | Benefit |
|------|--------|--------|
| **Health endpoint** | `GET /api/health` | Uptime / deploy probes |
| **Supabase client types** | Untyped browser client without generated schema | Production builds succeed |
| **Package** | Version `1.1.4`, `engines.node` 24.x | Clear runtime contract |

## How to verify (UX batch)

1. Public portal: complete a report — progress stepper, optional severity, **Review summary**, success copy-ID.
2. Submit a second similar location/vehicle report — soft duplicate banner appears.
3. Keyboard: Tab to sector cards and activate with Enter/Space.
4. Command Centre: set status filter, clear filters; SLA-overdue items sort and badge first.
5. Open any case modal — status pipeline and SLA banner when overdue.
6. Official dashboard — SLA overdue metric and queue badges.

## Residual recommendations

- Shared rate limit store when running multiple instances.
- Enforce production RLS migrations and rotate seed credentials.
- Expo push token storage for assigned-case fan-out.
- Optional generated Supabase `Database` types for stricter table typing.
- ESLint config + CI lint job.
- Mount `NearbyReportsHint` when geo-proximate open cases exist.

## Version

Platform version reflected in `package.json` and health payload: **1.1.4**.
