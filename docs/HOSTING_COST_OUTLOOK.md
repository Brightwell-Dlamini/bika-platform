# BIKA Platform — Hosting & Cost Outlook for Launch

**Prepared for:** Client / Project Owner  
**Date:** 18 August 2026  
**Purpose:** Recommend the most cost-effective production hosting stack for launch and provide a clear monthly cost outlook.

---

## 1. Recommended Stack (Most Cost-Effective for Launch)

The platform is already built on **Next.js + Supabase + Expo**. The most cost-effective and lowest-risk way to host it for launch is to stay on the services the codebase is designed for, while selecting the lowest paid tiers that are suitable for real production use.

| Layer | Service | Recommended Plan | Approximate Monthly Cost (USD) |
|-------|---------|------------------|--------------------------------|
| Web application (Next.js) | **Vercel** | Pro | **$20** |
| Backend (Database, Auth, Storage, Realtime) | **Supabase** | Pro | **$25 – $35** |
| Mobile builds & updates | **Expo EAS** | Free (or Starter if needed) | **$0 – $19** |
| Optional notifications (email/SMS) | Resend + Twilio | Pay-as-you-go | **$0 – $10** (launch volume) |
| Custom domain | Any registrar | Annual | ~$1 – $2 |
| **Estimated total at launch** | | | **≈ $45 – $75 / month** |

This combination requires **no code changes**, preserves all existing features (Realtime, Storage, Auth, PWA, mobile offline queue), and is the lowest-cost path that is genuinely production-ready.

---

## 2. Why These Choices

### 2.1 Vercel (Web Hosting) — Pro at $20/month

**Why Vercel**
- The application is built with Next.js 15 App Router. Vercel is the platform created by the Next.js team and offers the best native support (automatic deployments from Git, edge network, serverless functions, preview deployments).
- Switching to a generic VPS or container host would require additional DevOps work (Docker, reverse proxy, SSL, CI/CD, scaling) and would increase both cost and operational risk at launch.

**Why Pro (not Hobby)**
- Hobby is free but is intended for personal / non-commercial projects and has tighter usage limits. A national platform requires commercial-use rights, higher request allowances, better logging, and spend controls.
- Pro includes a $20 monthly usage credit and supports commercial production workloads.

**What you get**
- Automatic Git-based deploys
- Global edge network and HTTPS
- Preview deployments for every pull request
- Sufficient bandwidth and function capacity for launch traffic

### 2.2 Supabase (Backend) — Pro at ~$25–35/month

**Why Supabase**
- The entire data layer, authentication, file storage, and Realtime features are already implemented against Supabase. Migrating to another database or auth provider would be a major re-engineering effort.
- One service covers PostgreSQL, Auth, Storage, and Realtime — fewer moving parts and lower total cost than assembling separate services.

**Why Pro (not Free)**
- Free tier limitations that make it unsuitable for a national launch:
  - Database size capped at 500 MB
  - Only 5 GB egress
  - Projects can be paused after inactivity
  - Only 200 concurrent Realtime connections
  - Limited storage (1 GB)
- Pro removes pausing, provides 8 GB database disk (expandable), 250 GB egress, 100 GB storage, 100 000 monthly active users, higher Realtime limits, and a Spend Cap option to prevent surprise bills.

**Typical Pro cost breakdown**
- Base Pro subscription: **$25**
- Compute: Micro (~$10) is largely covered by the $10 monthly Compute Credits included with paid plans → effective compute cost often near zero for a single project; Small (~$15) if more headroom is desired.
- Result for a single production project at launch: **approximately $25 – $35 per month**.

### 2.3 Expo EAS (Mobile Builds) — Free tier preferred

**Why Expo EAS**
- The mobile application is already an Expo project. EAS is the official build and submission service and integrates cleanly with the existing `eas.json` configuration.

**Why Free tier at launch**
- Free plan includes 15 Android + 15 iOS builds per month — more than enough for initial store submission and occasional updates.
- Only move to Starter ($19/month) if higher-priority builds or more frequent releases become necessary.

Mobile hosting itself has no ongoing server cost; the app runs on users’ devices and talks directly to the same Supabase backend.

### 2.4 Optional Notification Services

- **Resend** (email) and **Twilio** (SMS) are already supported by the existing `/api/notify` route.
- Both are pay-as-you-go. At launch volumes (low hundreds of high-severity alerts) the cost is typically only a few dollars per month or less.
- These can remain unconfigured until the operations team is ready to enable them.

---

## 3. Monthly Cost Outlook

### Launch Phase (first 1–3 months — low to moderate traffic)

| Item | Estimated Monthly Cost (USD) | Notes |
|------|------------------------------|-------|
| Vercel Pro | $20 | Fixed platform fee |
| Supabase Pro + compute | $25 – $35 | Base $25 + modest compute after credits |
| Expo EAS | $0 | Free tier sufficient |
| Notifications (Resend/Twilio) | $0 – $5 | Only if enabled |
| Domain (amortised) | ~$1 – $2 | Annual registration |
| **Total** | **≈ $46 – $62** | Conservative launch range |

### Early Growth Phase (higher but still manageable traffic)

If monthly active users and data volumes increase:

| Item | Estimated Monthly Cost (USD) | Notes |
|------|------------------------------|-------|
| Vercel Pro + usage | $20 – $40 | Extra bandwidth / function usage if traffic rises sharply |
| Supabase Pro + usage | $30 – $60 | Possible egress or storage overages; still well within Pro quotas for most national pilots |
| Expo EAS Starter (optional) | $19 | Only if more frequent or priority builds are required |
| Notifications | $5 – $15 | Volume-dependent |
| **Total** | **≈ $55 – $130** | Still modest for a national system |

### What is deliberately avoided (and why)

| Alternative | Why not chosen for launch |
|-------------|---------------------------|
| Self-hosted VPS (DigitalOcean, Hetzner, etc.) | Requires significant DevOps effort (Docker, Nginx/Caddy, SSL, backups, monitoring, security hardening). Higher operational risk and staff time cost. |
| Railway / Render / Fly.io for the whole stack | Possible, but would require re-architecting away from the current Supabase integration and losing managed Auth + Realtime + Storage convenience. |
| Supabase Free + Vercel Hobby | Not suitable for a production national launch (pausing, commercial-use restrictions, tight quotas). |
| Enterprise tiers | Unnecessary cost at launch; can be considered later if scale or compliance demands it. |

---

## 4. Cost-Control Recommendations

1. **Enable Supabase Spend Cap** on the Pro plan so usage items cannot generate unexpected charges beyond the included quotas.
2. **Start with Micro compute** on Supabase and only upgrade to Small if performance metrics justify it.
3. **Monitor usage** weekly in the first month via the Supabase and Vercel dashboards.
4. **Keep EAS on Free** until build volume or queue priority becomes a bottleneck.
5. **Defer paid notification channels** until the operations team is ready to process alerts.
6. **Use the existing Ops Runbook** (`docs/OPS_RUNBOOK.md`) for backup and day-to-day operational procedures.

---

## 5. Summary for the Client

The most cost-effective and lowest-risk way to host and run BIKA at launch is:

- **Vercel Pro** for the Next.js web application ($20/month)
- **Supabase Pro** for the complete backend ($25–35/month)
- **Expo EAS Free** for mobile builds ($0/month)

**Expected monthly cost at launch: approximately $45 – $75 USD.**

This stack:
- Matches the existing architecture exactly (no rewrite required)
- Provides production-grade reliability, security, and scalability headroom
- Keeps costs transparent and controllable
- Allows the platform to go live quickly while remaining affordable for a national pilot or early operational phase

When traffic and institutional requirements grow, the same stack can scale vertically (larger Supabase compute, higher Vercel usage) or be complemented later without discarding the current investment.

---

*Document prepared to support transparent decision-making for launch hosting and budgeting.*
