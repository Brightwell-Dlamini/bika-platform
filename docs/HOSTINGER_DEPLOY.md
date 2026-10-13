# Hostinger + dual sites (BIKA + eca-sz)

## Critical finding (31 Aug 2026)

`https://bika.eca-sz.org` currently fails with **DNS NXDOMAIN** — the hostname does not resolve.

| Hostname | Status |
|----------|--------|
| `eca-sz.org` / `www.eca-sz.org` | Resolves; Hostinger Next.js returns HTTP 200 |
| `bika.eca-sz.org` | **No A/CNAME record** — site cannot load no matter what Node does |
| `bika-eswatini.vercel.app` | Resolves; **HTTP 200** (working BIKA) |

Until DNS for `bika` exists, Hostinger runtime logs (SIGTERM, double Ready, Server is not running) are secondary. Fix DNS first.

---

## Recommended production setup (both sites up)

Keep **two separate products on two platforms** so they never fight over the same Node process or port.

| Site | Host | Why |
|------|------|-----|
| **Main ECA** (`eca-sz.org`) | Hostinger Web App (Next.js) | Already live |
| **BIKA** (`bika.eca-sz.org`) | **Vercel** (`bika-eswatini.vercel.app`) | Always-on, no idle SIGTERM, already works |

### Point the subdomain at Vercel (fastest reliable path)

1. **Vercel** → project for `bika-platform` → **Settings → Domains** → add `bika.eca-sz.org`.
2. **Hostinger DNS** (Domains → DNS / DNS Zone for `eca-sz.org`):
   - Prefer **CNAME**: `bika` → `cname.vercel-dns.com` (use the exact target Vercel shows), **or**
   - Use the **A** records Vercel lists for the domain.
3. Wait for DNS (often minutes; up to ~1 hour).
4. Confirm: `https://bika.eca-sz.org` loads the same app as `https://bika-eswatini.vercel.app`.

Main domain stays on Hostinger unchanged. No port conflict. Both sites stay up.

---

## If you insist on BIKA on Hostinger Node

You need **all** of the following.

### 1. DNS on Hostinger

In hPanel → **Domains** → `eca-sz.org` → DNS:

- Create subdomain **`bika`** as its **own website / Web App** (not only a folder under the main site).
- Hostinger must create the **A/CNAME** for `bika.eca-sz.org` automatically when the Web App is attached to that hostname.
- Verify with: `nslookup bika.eca-sz.org` — must return an IP, not NXDOMAIN.

### 2. Separate Web Apps (mandatory)

| App | Domain | Repo |
|-----|--------|------|
| ECA | `eca-sz.org` (and www) | `eca-sz` |
| BIKA | `bika.eca-sz.org` only | `bika-platform` |

Never point two Node apps at the same hostname. Never run two entry processes for one app.

### 3. BIKA hPanel settings (Path A — native Next.js)

Official Hostinger rule: **Next.js does not need an entry file** — Hostinger starts the standalone server.

| Field | Value |
|-------|--------|
| **Application type** | `next` |
| **Node.js version** | `22` or `24` |
| **Build script** | `build` |
| **Output directory** | `.next` |
| **Entry file** | **EMPTY** |
| **Root directory** | `/` (repo root) |

Environment variables (runtime + build):

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 4. Path B only if Path A fails

| Field | Value |
|-------|--------|
| **Application type** | `other` |
| **Entry file** | `scripts/start-production.js` |
| **Build script** | `build` |
| **Output directory** | `.next` |

Do **not** combine type `next` + a filled Entry file (causes double start → `Server is not running`).

### 5. Expected runtime behaviour on Hostinger

Idle stop is **normal**:

```text
[bika] ready …
[bika] SIGTERM received — graceful close (Hostinger/process manager restart is normal)
[bika] ready …
```

First request after idle can take several seconds (cold start). That is not a code bug.

Rapid restart every few seconds is **not** idle — then check Entry file, duplicate Web Apps, or plan memory limits.

---

## Repo behaviour (v1.1.6+)

1. `next.config.js` → `output: 'standalone'`
2. `npm run build` → runs `scripts/postbuild-standalone.js` to copy `public/` and `.next/static` into `.next/standalone` (required for self-hosted Next)
3. `npm start` → `scripts/start-production.js` (standalone server, uses `PORT` from Hostinger)
4. Custom `server.js` remains for Path B fallback only

---

## Checklist

1. [ ] `nslookup bika.eca-sz.org` resolves (not NXDOMAIN)
2. [ ] Either CNAME/A to Vercel **or** a dedicated Hostinger Web App on that hostname
3. [ ] BIKA app: type `next`, **empty** entry file (or type `other` + single start script)
4. [ ] Supabase env vars set on the host that actually serves the domain
5. [ ] One process in runtime logs (not two interleaved `▲ Next.js` starts)
6. [ ] Open site in a private window; allow 10–20s on first hit if Hostinger cold-started

---

## Summary

| Problem | Fix |
|---------|-----|
| NXDOMAIN / site not found | Create DNS for `bika.eca-sz.org` |
| Port / double start | Two Web Apps, two hostnames; empty entry for native Next |
| SIGTERM after idle | Expected on Hostinger shared Node |
| Need always-on BIKA | Point subdomain at **Vercel** (recommended) |
