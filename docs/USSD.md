# BIKA USSD — complete beginner guide

You do **not** build USSD the way you build a website.

| Piece | Who provides it | What it does |
|-------|-----------------|--------------|
| **Phone dials `*CODE#`** | Mobile network (MTN, Eswatini Mobile, etc.) | Opens a text menu on any phone |
| **Gateway / aggregator** | Telco partner or Africa’s Talking–style provider | Receives the dial, calls **your** server on each key press |
| **BIKA `/api/ussd`** | This platform (already in the code) | Returns the next menu screen or a final message |
| **Supabase** | Your database | Stores reports / returns track status / hotlines |

```text
Citizen dials *XXX#
        │
        ▼
  Mobile network + aggregator
        │  HTTP POST on every menu step
        ▼
  https://YOUR-DOMAIN/api/ussd
        │
        ▼
  BIKA replies with plain text:
    CON = show menu, keep session open
    END = final message, close session
        │
        ▼
  Aggregator shows that text on the phone
```

**You cannot finish this alone in code.** You need a **USSD short code** and a **callback URL** registered with a licensed provider. The code in this repo is the BIKA side of that handshake.

---

## What is already built in BIKA

| Item | Location |
|------|----------|
| Webhook | `POST https://<your-app>/api/ussd` |
| Menu engine | `app/lib/ussd/engine.ts` |
| Health check | `GET https://<your-app>/api/ussd` |

**Menus on the phone**

```text
BIKA Eswatini
1. Report issue
2. Track report
3. Emergency hotlines
0. Exit
```

- **Report** → region → category → severity → short description → BIKA reference number  
- **Track** → type reference → status  
- **Hotlines** → numbers from your Supabase `hotlines` table + 999 reminder  

Reports are saved to the **same** `incidents` table as the website.

---

## Step-by-step: connect USSD to your platform

### Step 1 — Deploy the web app publicly

USSD gateways can only call a **public HTTPS** URL.

1. Deploy BIKA on **Vercel** (or any host) so you have a live domain, e.g.  
   `https://bika-platform.vercel.app`
2. Confirm in a browser:

```text
https://YOUR-DOMAIN/api/ussd
```

You should see JSON like:

```json
{
  "service": "BIKA USSD",
  "endpoint": "/api/ussd",
  "method": "POST",
  ...
}
```

If that fails, fix deploy/env before talking to any telco.

---

### Step 2 — Ensure Supabase is live

USSD uses the same project as the website.

On Vercel (Project → Settings → Environment Variables):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...    # strongly recommended for USSD writes
```

Redeploy after saving env vars.

Optional but recommended: run SQL migrations you already have (`004`, `005`) so track RPC and columns exist.

---

### Step 3 — Choose how you will get a USSD code

You need **one** of these paths (common in Southern Africa):

#### Option A — Aggregator (often easiest for a first app)

Examples of the *type* of provider (availability in Eswatini depends on local licensing):

- **Africa’s Talking** (and similar “cloud USSD” platforms)
- A regional **SMS/USSD aggregator** your ministry already uses

They give you:

- A sandbox/simulator to test without a real `*code#`
- Later, a production service code after approval

#### Option B — Direct with the mobile network (MNO)

- **MTN Eswatini**, **Eswatini Mobile**, etc.
- Usually needs a **company/government contract**, paperwork, and longer lead time
- They (or their technical partner) will ask for your **callback URL**

#### Option C — Ministry / ICT authority route

For a **national** system, often the cleanest path is:

1. Ministry writes to the regulator / MNOs  
2. MNO or designated aggregator issues a short code for BIKA  
3. Their engineers point traffic to your callback  

**You do not invent `*123#` in GitHub.** The network assigns it.

---

### Step 4 — Create the provider account and application

Whatever provider you pick, the flow is usually:

1. Sign up / sign a contract  
2. Create an **application** or **product** named e.g. `BIKA USSD`  
3. Find **USSD** settings  
4. Set **Callback URL** (sometimes called “Notification URL” or “Application URL”) to:

```text
https://YOUR-DOMAIN/api/ussd
```

5. Method must be **POST**  
6. Content type they send is almost always:

```text
application/x-www-form-urlencoded
```

BIKA also accepts JSON if a provider uses that.

---

### Step 5 — Tell the provider what fields BIKA expects

Our webhook already understands the **common Africa’s Talking field names** and several aliases.

| Concept | Names BIKA accepts |
|---------|---------------------|
| Session id | `sessionId`, `session_id`, `SessionId` |
| Phone | `phoneNumber`, `phone_number`, `msisdn`, `MSISDN` |
| Service code | `serviceCode`, `service_code` |
| User input so far | `text`, `ussd_body`, `USSDBody` |

**How `text` works (important):**

- First screen: `text` is empty → BIKA sends main menu  
- User presses `1` → gateway sends `text=1`  
- User then presses `2` → gateway sends `text=1*2`  
- And so on (`1*2*3*my description here`)  

You do **not** store menu state on the phone. The gateway accumulates `text`; BIKA reads that path.

**What BIKA responds with (plain text body, HTTP 200):**

```text
CON line1
line2
line3
```

or

```text
END final message here
```

- `CON` = keep the USSD session open  
- `END` = close the session  

This is the industry pattern most aggregators (including Africa’s Talking) expect.

If a local MNO uses slightly different field names, send them this table; we can add aliases in code without changing the phone menus.

---

### Step 6 — Secure the webhook (do this before production traffic)

In Vercel env:

```env
USSD_WEBHOOK_SECRET=pick-a-long-random-string
```

Then either:

**A)** Callback URL with query secret (many portals allow this):

```text
https://YOUR-DOMAIN/api/ussd?secret=pick-a-long-random-string
```

**B)** Custom header (if the gateway supports it):

```text
x-ussd-secret: pick-a-long-random-string
```

If `USSD_WEBHOOK_SECRET` is **not** set, BIKA accepts all POSTs (OK only for early testing).

Redeploy after setting the secret.

---

### Step 7 — Test without a real phone (mandatory)

#### 7a — Health check

```bash
curl -s https://YOUR-DOMAIN/api/ussd
```

#### 7b — Simulate “user just dialed the code” (empty text → main menu)

```bash
curl -s -X POST https://YOUR-DOMAIN/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "sessionId=test-1&phoneNumber=%2B26876123456&serviceCode=%2A123%23&text="
```

Expected start of body:

```text
CON BIKA Eswatini
1. Report issue
...
```

#### 7c — Simulate choosing “Report” (`text=1`)

```bash
curl -s -X POST https://YOUR-DOMAIN/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "sessionId=test-1&phoneNumber=%2B26876123456&serviceCode=%2A123%23&text=1"
```

You should get the **region** menu.

#### 7d — Full report path example

Region Manzini (2) → Road (1) → HIGH (3) → description:

```bash
curl -s -X POST https://YOUR-DOMAIN/api/ussd \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "sessionId=test-1&phoneNumber=%2B26876123456&serviceCode=%2A123%23&text=1*2*1*3*Kombi+overloading+at+rank"
```

Expected: `END BIKA received.` with a `BIKA-...` reference.

Then open **Command Centre** on the website — the incident should appear.

#### 7e — If you set a secret

```bash
curl -s -X POST "https://YOUR-DOMAIN/api/ussd?secret=YOUR_SECRET" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "sessionId=test-1&phoneNumber=%2B26876123456&serviceCode=%2A123%23&text="
```

#### 7f — Provider simulator

Africa’s Talking and many aggregators have a **USSD simulator** in their dashboard. Point it at the same callback URL and walk the menu on screen before any short code goes live.

---

### Step 8 — Give the provider a one-page technical brief

Copy/paste this to the telco or aggregator engineer:

```text
BIKA USSD callback
------------------
URL:    https://YOUR-DOMAIN/api/ussd
Method: POST
Body:   application/x-www-form-urlencoded

Request fields (or equivalent):
  sessionId, phoneNumber, serviceCode, text

Response:
  HTTP 200
  Content-Type: text/plain; charset=utf-8
  Body starts with CON (continue) or END (terminate)

Auth (production):
  Query ?secret=...  or  header x-ussd-secret: ...

Timeout: please allow at least 10–15 seconds for first response
Idempotency: session driven by sessionId + text path
```

---

### Step 9 — Go live checklist

- [ ] `GET /api/ussd` works on production domain  
- [ ] curl POST returns `CON BIKA Eswatini`  
- [ ] Full report creates a row visible on the web Command Centre  
- [ ] Track by reference works on USSD menu 2  
- [ ] Hotlines menu shows real numbers from Supabase  
- [ ] `USSD_WEBHOOK_SECRET` set and tested  
- [ ] Provider sandbox tests passed  
- [ ] Short code approved and mapped to callback  
- [ ] Soft launch with a few internal SIMs before public posters  

---

## What you must not expect from USSD

- No photos / GPS / rich UI (feature phone limitation)  
- Short screens (~160 characters per step)  
- Not a replacement for **999** in life-threatening emergencies  
- Session can drop if the network is slow — user dials again  

---

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Provider says “callback failed” | App not deployed, wrong URL, or HTTPS certificate issue |
| Always “Forbidden” | `USSD_WEBHOOK_SECRET` set but provider not sending secret |
| Empty or wrong menus | `text` field not passed or different field name — check provider payload |
| Report not in website | Supabase env missing on Vercel; check function logs |
| Track always “not found” | Wrong reference typing; confirm incident exists in Supabase |
| Works in curl, not on phone | Callback URL in provider portal still pointing to localhost or old domain |

**Vercel logs:** Project → Deployments → Functions → `/api/ussd`  

---

## Environment variables summary

```env
# Required for USSD data
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # recommended

# Production webhook protection
USSD_WEBHOOK_SECRET=
```

---

## Code map (for developers)

| File | Role |
|------|------|
| `app/api/ussd/route.ts` | HTTP webhook for telco/aggregator |
| `app/lib/ussd/engine.ts` | Menu logic (stateless via `text`) |
| `docs/USSD.md` | This guide |

Web and mobile UI are **not** required for USSD to work. USSD is a parallel channel into the same database.

---

## Your action list (short)

1. Deploy BIKA + Supabase env on Vercel  
2. Confirm `GET /api/ussd` and curl POST menu  
3. Contact aggregator **or** MNO **or** ministry ICT for a USSD code  
4. Register callback `https://YOUR-DOMAIN/api/ussd`  
5. Test in their simulator  
6. Set `USSD_WEBHOOK_SECRET`  
7. Soft launch, then publicise the `*code#`  

Until step 3–4 happen, the code is ready but **no phone in the country can dial into BIKA yet** — that part is commercial/regulatory, not missing software.
