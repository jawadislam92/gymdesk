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
- [ ] **Pre-launch security hardening** (tracked in `BUILD_TRACKER.md`): move the
      web refresh-token from `localStorage` to an httpOnly cookie. Fine for local
      testing; do before public traffic.
- [ ] **Online card payments**: add Stripe keys (see §5) — only needed when you
      want gyms to charge cards online vs. recording cash/manual payments.

---

## 5. Adding online card payments later (Stripe)

The Stripe integration is built and **config-gated** — it stays dormant until keys
exist, so the app runs fine without it. To turn it on, you create a free Stripe
account and add **test** keys first:

| Variable (on `gymflow-api`) | Where to get it |
|------------------------------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (use `sk_test_…` first) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks → add endpoint `…/api/v1/billing/webhook` |

With test keys set, we verify the full flow end-to-end (test card `4242 4242 4242
4242`) before ever switching to live keys. **Entering live keys / real card data is
your step, not mine** — I'll never handle real payment credentials.

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

_Last updated: 2026-06-15. Keep this in sync with `.env.example` and
`BUILD_TRACKER.md`._
