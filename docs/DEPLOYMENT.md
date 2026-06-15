# Taking GymFlow Suite online (deployment guide)

This is the playbook for moving GymFlow from "running on this laptop" to "a real
gym can use it from any browser." It is written so a **non-technical owner** knows
exactly what to do, and so any developer (or a future Claude session) can execute
the deploy without re-deriving anything.

> **TL;DR for the owner:** You create **3 free accounts** (≈10 minutes), paste me
> the connection details, and I do all the wiring and deploying with you. You do
> **not** need to understand the technical sections — they're for whoever runs the
> deploy. Nothing here costs money on the free tiers.

---

## 1. What the app is made of (plain language)

GymFlow is four "surfaces" (gym admin, member portal, your Sparking Asia platform
console, public join pages) — but technically it's just **two programs + two data
stores**:

| Piece | What it does | Where it lives now | Where it goes online |
|-------|--------------|--------------------|----------------------|
| **Web app** (Next.js) | Everything you see in the browser | `apps/web` | A hosting service (Railway/Render/Vercel) |
| **API** (NestJS) | The brain — rules, logins, data | `backend` | A hosting service (Railway/Render) |
| **Database** (PostgreSQL) | Permanent storage — members, payments, etc. | Local Postgres on this PC | Neon (managed Postgres) |
| **Cache** (Redis) | Login sessions / refresh tokens | Local Redis (Laragon) | Upstash (managed Redis) |

Online, these four talk to each other over the internet instead of over localhost.
That's the whole move.

---

## 2. ✅ What YOU (the owner) do — ~10 minutes, all free

Create these three accounts. For each, after signing up, **copy the one value
listed and send it to me** (paste into our chat). That's it — I do the rest.

1. **Neon** — the online database → <https://neon.tech>
   - Sign up (free). Click **Create project** → name it `gymflow`.
   - Copy the **connection string** it shows (starts with `postgresql://…`).
   - 📋 Send me: that connection string. *(This is the one secret to treat carefully —
     it's like the key to your data. We'll store it safely, never in code.)*

2. **Upstash** — the online cache/sessions → <https://upstash.com>
   - Sign up (free). Create a **Redis** database (any region near your gyms).
   - Copy the **`redis://…` URL** (the "Redis Connect" / `UPSTASH_REDIS_URL`).
   - 📋 Send me: that `redis://…` URL.

3. **Railway** — where the app actually runs → <https://railway.app>
   - Sign up with your **GitHub account** (the same one you push this repo with).
   - You don't need to copy anything — just tell me the account exists and that
     you've connected the `gymdesk` repository. I deploy from there.

> Prefer not to copy/paste secrets in chat? That's the right instinct. When we get
> there I'll show you how to paste each value **directly into the hosting
> dashboard** so I never need to see it. Either way works.

**You can stop reading here.** The rest is the technical runbook for the deploy.

---

## 3. 🔧 What I (Claude) do with you — the deploy runbook

The first deploy is best done **together in a live session** (~30–45 min) — not
because it's hard, but because account dashboards change and it's faster to react
to what's on your screen than to script it blind. Here's the plan I'll follow.

### 3.1 Services to create on Railway
- **`gymflow-api`** — Node service, root = repo, build/start commands below.
- **`gymflow-web`** — Node service, root = repo, build/start commands below.
- (Database + Redis come from Neon + Upstash above, not Railway, to use their
  better free tiers. Railway's own Postgres/Redis plugins also work if you'd
  rather keep everything in one place.)

### 3.2 Build & start commands (source of truth)

These match how the app builds locally today (already verified — `next build` and
`nest build` both pass).

**API (`gymflow-api`):**
```bash
# Install (monorepo-aware)
corepack enable && pnpm install --frozen-lockfile
# Generate Prisma client + build the shared package + compile Nest
pnpm --filter @gymflow/shared build
pnpm --filter @gymflow/backend exec prisma generate
pnpm --filter @gymflow/backend exec nest build
# Apply DB schema to the managed database (run once per deploy)
pnpm --filter @gymflow/backend exec prisma migrate deploy
# Start
node backend/dist/main.js
```

**Web (`gymflow-web`):**
```bash
corepack enable && pnpm install --frozen-lockfile
pnpm --filter @gymflow/shared build
# NEXT_PUBLIC_API_URL must be set BEFORE this build — it's baked into the bundle
pnpm --filter @gymflow/web build
# Start (Next listens on $PORT)
pnpm --filter @gymflow/web start
```

> ⚠️ **Gotcha:** `NEXT_PUBLIC_API_URL` is compiled into the web bundle at build
> time, not read at runtime. If the API URL changes, the web app must be
> **rebuilt**, not just restarted.

### 3.3 Environment variables to set (per service)

Copy from `.env.example`. Generate the two JWT secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**`gymflow-api` env:**
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon connection string (append `?sslmode=require` if not present) |
| `REDIS_URL` | Upstash `redis://…` URL |
| `JWT_ACCESS_SECRET` | random 48-byte hex (generate fresh) |
| `JWT_REFRESH_SECRET` | random 48-byte hex (generate fresh, different) |
| `JWT_ACCESS_TTL` | `15m` |
| `JWT_REFRESH_TTL` | `30d` |
| `CORS_ORIGIN` | the web app's public URL, e.g. `https://gymflow-web.up.railway.app` |
| `NODE_ENV` | `production` |
| `PORT` | leave unset — the host injects it |

**`gymflow-web` env:**
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | the API's public URL + `/api/v1`, e.g. `https://gymflow-api.up.railway.app/api/v1` |

### 3.4 First-run on the live database
The managed DB starts empty. After the first successful API deploy, create the
first platform super-admin + demo gym by running the seed against the live DB:
```bash
# locally, pointed at the production DATABASE_URL (one time)
pnpm --filter @gymflow/backend exec prisma db seed
```
Then immediately log in and change that password. *(If we'd rather not seed demo
data into production, I can instead create just one real super-admin account — your
call when we get there.)*

---

## 4. Go-live checklist (before a real gym uses it)

- [ ] Fresh, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (never the
      `change-me-*` defaults).
- [ ] `CORS_ORIGIN` set to the real web URL(s) — not left blank/open.
- [ ] Demo/seed passwords changed (or seed data removed for a clean production DB).
- [ ] Custom domains pointed (e.g. `app.yourbrand.com` → web,
      `api.yourbrand.com` → API), then update `CORS_ORIGIN` + `NEXT_PUBLIC_API_URL`
      and **rebuild web**.
- [ ] Neon "point-in-time restore" / backups confirmed on (free tier includes a
      retention window).
- [x] **Server hardening** applied on the VPS (see §8) — swap, auto security
      updates, fail2ban, daily DB backups, Nginx security headers + rate limits,
      key-only SSH.
- [ ] **App-level hardening** still recommended before heavy public traffic (see §8):
      move the web refresh-token from `localStorage` to an httpOnly cookie, and run
      the Node app as a non-root service user. Both are app/deploy changes best done
      with local testing first.
- [ ] **Online card payments**: add Stripe keys (see §5) — only needed when you
      want gyms to charge cards online vs. recording cash/manual payments.

---

## 5. Adding online card payments later (Stripe)

The Stripe integration is **built and config-gated** — it stays dormant until a key
exists, so the app runs fine on manual/cash payments without it. Endpoints live at
`/api/v1/billing/{status,checkout,confirm}`; flow is checkout → Stripe's hosted page
→ redirect back → confirm + record (idempotent on the Stripe session id).

To switch it on you only need **one** variable:

| Variable (on `gymflow-api`) | Where to get it |
|------------------------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (use `sk_test_…` first) |

That's enough to activate it (`/billing/status` flips to `enabled:true`, and a "Pay by
card (online)" button appears on the Payments screen). With the test key set, we verify
the full flow end-to-end (test card `4242 4242 4242 4242`) before ever switching to live
keys. **Entering live keys / real card data is your step, not mine** — I'll never handle
real payment credentials.

*Optional later hardening:* add a Stripe **webhook** (`STRIPE_WEBHOOK_SECRET`) so a
payment is captured even if the payer closes the tab before redirecting back. The
confirm step is already idempotent, so adding webhooks won't double-charge the books.

> Verified now (without keys): `status` returns `enabled:false`; `checkout`/`confirm`
> return a clear **503**; with a dummy key present the request correctly reaches Stripe
> and surfaces its auth error. Only a real test key (your step) can exercise a complete
> paid transaction.

---

## 5b. Switching on the AI Receptionist (Anthropic / Claude)

The AI receptionist is **built and config-gated**, the same way as Stripe — it stays
dormant until a key exists. It's a chat assistant on each gym's public page that answers
prospects' questions about plans and classes and **captures interested visitors straight
into the CRM lead pipeline** (it calls a `capture_lead` tool that creates the lead, so the
team gets a follow-up without the visitor filling in the form). Endpoints:
`/api/v1/public/gyms/:slug/ai/{status,chat}`.

To switch it on you only need **one** variable:

| Variable (on `gymflow-api`) | Where to get it |
|------------------------------|-----------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API keys (`sk-ant-…`) |
| `AI_MODEL` *(optional)* | defaults to `claude-opus-4-8`; set to a cheaper model (e.g. `claude-haiku-4-5`) to trim per-chat cost |

Once the key is set, `…/ai/status` flips to `enabled:true` and a floating "chat with us"
bubble appears on the public gym page. No restart-time secrets beyond the key. **Entering
the real key is your step, not mine** — I never handle API credentials.

> Verified now (without a key): `…/ai/status` returns `enabled:false` and the chat widget
> stays hidden; `…/ai/chat` returns a graceful "assistant offline" message instead of
> erroring. Only a real Anthropic key (your step) can exercise a live conversation.

---

## 6. Cost expectation

On the free tiers (Neon + Upstash + Railway's starter), running a pilot with a few
gyms is **$0–$5/month**. Costs scale only as real usage grows — at which point the
revenue from those gyms more than covers it. We'll review the numbers before you
ever commit to a paid tier.

---

## 7. Recommended sequence

1. Local (now) — keep building + testing features. ✅ *You are here.*
2. Owner creates the 3 accounts (§2) whenever you have ~10 minutes.
3. We do a live deploy session (§3) — GymFlow is online for a pilot gym.
4. Pilot feedback → iterate.
5. Add Stripe test keys (§5) → online payments.
6. Custom domain + security hardening (§4) → public launch.

---

## 8. Server hardening applied (on the VPS)

Done directly on the box (2026-06-16), live site unaffected — verified end-to-end
after each change. These are server-side, so they're **not** in the git repo; this is
the record of what's in place.

| Hardening | What it does |
|-----------|--------------|
| **2 GB swap** + `vm.swappiness=10` | Insures against out-of-memory kills during builds (box has 7.8 GB RAM, was 0 swap). |
| **Unattended security upgrades** | OS security patches install automatically (`20auto-upgrades`). |
| **fail2ban** (sshd jail, 5 tries / 10 min → 1 h ban) | Auto-bans IPs that brute-force SSH. |
| **Daily Postgres backups** | `gymflow-backup.sh` → gzipped `pg_dump` to `/opt/backups/gymflow`, 03:15 daily, 7-day retention. |
| **Nginx security headers** | HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on every response. |
| **Nginx rate limits** (per IP) | `/api/` 20 r/s (burst 50); public **AI** endpoints 2 r/s (burst 5) — protects the paid AI + blocks lead-spam. Rejections return 429. |
| **Key-only SSH** | `PasswordAuthentication no`, root login `prohibit-password` (key only) — brute-force surface gone. |

**Backups are local to the box** — good against app/DB mistakes, not against losing the
whole VPS. Before serious production, copy the nightly dump off-box too (Hostinger
snapshots, or scp to object storage). One line in `gymflow-backup.sh` away.

**Still recommended (app/deploy-level, do with local testing):**
- **httpOnly refresh-token cookie** — today the web keeps the refresh token in
  `localStorage`; moving it to an httpOnly cookie means a cross-site-script can't read
  it. Same-origin here (`gymrun.tech` serves web + `/api`), so it's a clean change.
- **Non-root app user** — `pm2` runs as `root`; running the Node app as a low-privilege
  service user contains the blast radius of any app vulnerability. Touches the deploy
  runbook, so worth a careful pass.

_Last updated: 2026-06-16. Keep this in sync with `.env.example` and
`BUILD_TRACKER.md`._
