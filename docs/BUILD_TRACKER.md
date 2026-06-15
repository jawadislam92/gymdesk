# GymFlow Suite — Build Tracker (living checklist)

> **The single source of truth for what is DONE and what's NEXT.** Tick boxes as work lands
> and add a one-line note. Pairs with [`PRODUCT_EXPANSION_PLAN.md`](PRODUCT_EXPANSION_PLAN.md)
> (full scope) and [`DECISIONS.md`](DECISIONS.md) (the why + gotchas).
>
> **Legend:** `[x]` done & verified · `[~]` in progress · `[ ]` not started · 🔌 = needs an
> external account/service · (B/C/A/D) = surface: Gym-admin / Member / Platform / Public.
>
> **Last updated:** 2026-06-14

---

## Phase 0 — Foundation ✅ (done)
- [x] Monorepo: pnpm workspaces + Turborepo, shared TS config, Prettier
- [x] `@gymflow/shared`: roles, RBAC permission map, status enums, zod schemas
- [x] Backend: NestJS on Fastify, `/api/v1`, Swagger at `/api/docs`, global Zod pipe
- [x] Prisma schema (22 tables, multi-tenant `gym_id`, indexes, soft-delete) + migrations
- [x] Local Postgres 16.6 + Redis running; seed (roles + demo gym/owner/plans)
- [x] Auth + RBAC: register/login/refresh/logout/me, argon2id, JWT+Redis, guards
- [x] Web app shell: Next.js 15 + Tailwind + TanStack Query, login, role-gated nav
- [x] One-click local run: `scripts/Start GymFlow App.bat`; docs system (this folder)

---

## Phase A — "Sellable core" (web, all surfaces) — *make a gym able to fully run on it*

### A1. Members & CRM
- [x] Members CRUD, auto member code, search/filter, soft-delete (B)
- [x] Member profile: history, payments, attendance, assign trainer (B)
- [x] Membership lifecycle: assign / renew / freeze / cancel (B)
- [ ] Member tags + custom fields (B)
- [x] **Membership agreement / waiver**: staff publish (versioned) + member accept-gate
      + acceptance log; full e-sign/PDF still TODO (B/C)
- [x] **Lead capture** (public-page enquiry → `leads`) + **staff Leads inbox** w/ status (B,D)
- [ ] Sales pipeline / Kanban; lead follow-up automation (tasks + reminders) (B)
- [ ] Trial management (B)

### A2. Scheduling, Classes & Booking
- [x] Classes: create/edit/cancel, capacity, trainer, location (B)
- [x] Class schedule — week calendar view w/ prev/next (B)
- [x] **Online class booking** + roster + capacity & duplicate guard (B/C)
- [x] Recurring classes (weekly copies via `repeatWeeks`) (B)
- [ ] Waitlists (auto-promote when a spot frees) (B/C)  ← next in A2
- [ ] Appointments / PT session booking (B/C)
- [ ] Cancellation policy, late-cancel / no-show handling (B/C)
- [ ] Class packs / credits (B/C)

### A3. Billing, Payments & Invoicing
- [x] Manual payment recording + invoice numbers + history (B)
- [~] **Stripe integration** — online card payments: `BillingModule`
      (`/billing/status|checkout|confirm`), **config-gated** on `STRIPE_SECRET_KEY`,
      idempotent recording (gatewayRef); web "Pay by card" button + confirm-on-return.
      Verified gating (503), DTO validation (400), and that a request reaches Stripe
      with a key present. Live paid transaction pending owner's test keys (B/C) 🔌
- [ ] **Recurring billing / subscriptions** (auto-charge) (B/C) 🔌
- [ ] Failed-payment recovery / dunning (B) 🔌
- [ ] Branded **PDF invoices & receipts** + tax/VAT (B/C)
- [ ] Local gateway adapter (Razorpay / JazzCash / Easypaisa / Paystack) (B/C) 🔌
- [ ] Discounts / coupons / promo codes (B/C/D)

### A4. Member Portal (Surface C — web)
- [x] Member login + "my membership" status & days remaining (C)
- [x] **Book / cancel classes** myself (C)
- [x] Payment history (receipt PDFs tracked under A3) (C)
- [x] My workouts (read) + my progress (log weight + history) (C)
- [ ] Profile, notifications, QR check-in code (C)
- [x] Member login/invite flow: staff "Create login" on member profile → sets
      credentials + assigns `member` role (B/C)

### A5. Public / Marketing (Surface D — web)
- [x] **GymFlow marketing landing** (`/`): hero, features, pricing, CTAs (D)
- [x] **Per-gym public page** (`/g/[slug]`): public schedule + plans + "Request to join" → lead (D)
- [ ] Online join *with payment* (needs Stripe) + embeddable booking widget (D)

### A6. Communications
- [ ] Email sending (Resend/Postmark) — receipts, reminders, resets (B/C) 🔌
- [ ] SMS (Twilio / local) (B/C) 🔌
- [x] In-app announcements (broadcast → member portal feed); push (FCM) 🔌 + per-user read TODO (B/C)
- [~] Renewals view (expiring memberships) + one-click reminder → member notification;
      automated cron (BullMQ) + email/SMS delivery still TODO (B)

### A7. Reporting (deepen)
- [x] Revenue / membership-growth / attendance charts + CSV (B)
- [x] Expenses tracking (CRUD) + **net profit** (revenue − expenses) on Reports (B)
- [ ] MRR / ARPU / retention / churn / cohort (B/A)
- [ ] At-risk member report; class utilization / peak hours (B)

### A8. Platform Console skeleton (Surface A — "our side")
- [x] Super-admin login (`admin@gymflow.app`) + gym list & onboarding (A)
- [x] Create gyms (+ owner); set SaaS plan & status (suspend = status) (A)
- [x] Cross-gym overview: total gyms / active / members / revenue (A)
- [ ] "Log in as gym" (support impersonation) (A)
- [ ] Per-tier feature gating / limits enforcement (A)

### A9. Platform plumbing
- [x] Multi-tenant scoping + RBAC enforced server-side
- [ ] Background jobs (BullMQ on Redis) for reminders/dunning/reports
- [ ] File storage (S3/R2) for docs, contracts, photos, videos 🔌
- [ ] Web auth → httpOnly cookies (replace localStorage) before public launch

---

## Phase B — "Loved & competitive"
### B1. Member + trainer mobile apps (Expo)
- [ ] Member app: status, book classes, pay/renew, workouts, progress, notifications (C)
- [ ] Trainer app: assigned members, build/assign plans, log progress (C)
- [ ] Push notifications (FCM); branded app option (white-label) (C)
### B2. Engagement & retention
- [ ] Loyalty points & rewards; referral program (B/C)
- [ ] Challenges, leaderboards, badges, streaks (B/C)
- [ ] Reviews/reputation prompts; surveys / NPS (B/C)
- [ ] Re-engagement / win-back automations (B)
### B3. Training & wellness depth
- [~] Workout plans + exercises (assign + member view); exercise *library* + video TODO (B/C)
- [x] Nutrition / diet plans (calories, macros, meals): staff assign + member view (B/C)
- [~] Progress: weight + body-fat + notes (staff record + member self-log + history);
      measurements/photos/PR-benchmarks TODO (B/C)
- [ ] Wearable / health-app sync (C) 🔌
### B4. Marketing automation
- [ ] Email/SMS campaign builder + drip automations + segments (B) 🔌
- [ ] Promotions, seasonal campaigns, social lead-ad integration (B/D) 🔌
### B5. Access control & POS
- [ ] QR + kiosk self check-in; door access integration (B) 🔌
- [ ] Live occupancy; guest/day passes (B/C)
- [x] POS / retail + inventory: products (catalog + stock), quick-sell (stock
      decrement + guard), recent sales + today total (B); multi-item cart TODO
### B6. Staff & operations
- [ ] Staff scheduling, time clock (B)
- [ ] Payroll & commissions (class/session/trainer) (B)
- [ ] Tasks / to-dos, document management (B)

---

## Phase C — "Scale & your business"
- [ ] **Platform Console full:** SaaS billing for gyms (Stripe Billing), plan gating, dunning (A) 🔌
- [ ] White-label per gym (branding, custom domain, custom app) (A) 🔌
- [ ] **Multi-branch / franchise:** branch switching, consolidated reporting, HQ oversight, royalties (A)
- [ ] Advanced analytics + forecasting; custom report builder (A/B)
- [ ] Public **API + webhooks**; Zapier/Make; accounting (QuickBooks/Xero) (B) 🔌
- [ ] **AI:** lead scoring, churn prediction, auto workout/diet generation, support chatbot (A/B/C) 🔌

---

## Cross-cutting / launch readiness
- [ ] Automated tests (auth + payments first), then E2E (Playwright)
- [ ] CI pipeline (lint/typecheck/test/build)
- [~] **The "online move":** managed Postgres/Redis (Neon/Upstash/Railway), deploy, backups 🔌
      — **my side ready:** full deploy runbook, env template, build/start commands, and
      env-configurable CORS done (see [`DEPLOYMENT.md`](DEPLOYMENT.md)); prod `next build` +
      `nest build` both pass. Awaits owner's 3 free accounts (Neon/Upstash/Railway).
- [ ] Security review (§15) before public launch
- [ ] Onboard 1 real gym (beta) for feedback (§17)

---

### Change log (append one line per work session)
- 2026-06-14 — Foundation + Gym-admin web app complete (members, plans, memberships,
  payments, attendance, dashboard, reports, staff, settings, trainers). Docs system created.
- 2026-06-14 — Phase A2: Classes & Scheduling shipped — backend classes/bookings module
  (create + weekly recurrence, list, book w/ capacity & duplicate guard, cancel) + web
  Schedule week view. Added `classes.manage` permission. Verified in-browser (Evening Yoga,
  booked 1/10, double-book → 409).
- 2026-06-15 — Phase A4: Member side shipped — `/me` member self-service module
  (summary, payments, attendance, my bookings, self-book/cancel, available classes) +
  `grant-login` so staff create a member's credentials. Web: role-based routing, member
  portal (`apps/web/app/(member)/portal`) with membership status, my classes, self-book,
  payments. Verified in-browser: Alice logs in → portal → books a class.
- 2026-06-15 — Phase A8: Platform Console ("our side") shipped — backend `/platform`
  (super_admin only): cross-gym overview, gym list, onboard gym (+owner), update
  subscription plan/status. Seeded `admin@gymflow.app` / `Admin123!`. Web `(platform)`
  console with role-based routing. Verified in-browser + API (3 gyms, onboarded "Peak
  Fitness", new owner logs in). **3 of 4 surfaces done; Public/landing (D) remains.**
- 2026-06-15 — Surface D + CRM start: public **marketing landing** (`/`, app moved to
  `/dashboard`); public **per-gym page** (`/g/[slug]`, no-auth: schedule + plans + join
  form) via `PublicModule`; **leads** table + `LeadsModule` + staff Leads inbox; lead link
  on Settings. Verified: public lead submit → appears in inbox (Prospect Pete, public_page).
  **All 4 surfaces now have a web presence.**
- 2026-06-15 — Training: `WorkoutsModule` (plans + exercises, WORKOUTS_MANAGE) +
  `ProgressModule` (PROGRESS_RECORD) + `/me` workouts/progress (read + member self-log).
  Web: member-profile "Training" card (create plan, add exercises, record progress) +
  member-portal "My workout"/"My progress". Verified: owner created "Strength A"
  (Squat/Bench) → Alice sees it + logs her own weight (2 entries).
- 2026-06-15 — Nutrition: `DietModule` (plans w/ calories, macros JSON, meals JSON;
  WORKOUTS_MANAGE) + `/me/diet`. Web: member-profile "Nutrition" card (create) +
  member-portal "My diet". Verified: owner created "Cutting plan" (2000 kcal, 2 meals)
  → Alice sees it. Member portal now: status, classes, payments, workout, progress, diet.
- 2026-06-15 — Announcements: `NotificationsModule` (broadcast announcement → row w/
  user_id null; list) + `/me/notifications` (member feed = own + broadcasts). Web: Settings
  composer + member-portal Announcements feed. Verified: "Holiday hours" broadcast → Alice
  sees it. (Push/FCM + per-user read still TODO.)
- 2026-06-15 — Waivers: `waivers` + `waiver_acceptances` tables; `WaiversModule` (staff
  publish versioned agreement, GYM_SETTINGS) + `/me/waiver` (+ accept). Web: Settings editor
  (version + accepted count) + member-portal accept-gate (re-accept on new version).
  Verified: publish → Alice accepts → count 1; publish v2 → Alice sees gate again.
- 2026-06-15 — Renewals/retention: `RenewalsModule` (GET expiring memberships, POST remind →
  member 'renewal' notification; MEMBERSHIPS_RENEW). Web `/renewals` page (window filter +
  Remind) + nav. Verified: 2 expiring → reminded Alice → she sees the renewal in her feed.
- 2026-06-15 — Expenses + profit: `ExpensesModule` (CRUD, DASHBOARD_VIEW) + `/reports/expenses`
  (monthly SQL). Web `/expenses` page + nav; Reports adds Expenses chart + **Net profit**
  (revenue − expenses). Verified: $620 expenses vs $70 revenue → profit −$550.
- 2026-06-15 — UI polish pass: added `lucide-react`; redesigned gym-admin sidebar (icons,
  logo mark, avatar footer) + dashboard (greeting, icon KPI tiles, quick actions); member
  portal (logo header, gradient membership card). Screenshots confirm a clean, premium look.
- 2026-06-15 — POS/retail: `products` + `sales` tables; `PosModule` (products CRUD, quick
  sell w/ stock decrement + guard, recent sales + today total; PAYMENTS_COLLECT). Web `/shop`
  page + nav. Verified: Whey Protein, sold ×2=$80, stock 10→8, overspend → 409.
- 2026-06-15 — Polish + deploy-readiness pass: platform console upgraded to premium
  (subtitle + colored icon-tile KPIs, matching gym dashboard). Env-configurable CORS
  (`CORS_ORIGIN`, safe local default) + `.env.example` updated. Wrote `docs/DEPLOYMENT.md`
  (owner's 3-account steps + full deploy runbook). Verified prod `next build` + `nest build`
  pass; backend healthy after CORS change. (Owner can't do their side yet — finishing my side.)
- 2026-06-15 — Completeness features (all owner-side-free, verified in-browser):
  • CSV export (members + payments) — `lib/csv.ts`, paginates all rows; captured blobs correct.
  • Printable receipts (payments + shop sales) — `lib/receipt.ts`, branded print/PDF; captured
    HTML correct (incl. qty line).
  • Online payments (Stripe) — `BillingModule` config-gated on `STRIPE_SECRET_KEY`; status/
    checkout/confirm, idempotent recording; web Pay-by-card + confirm-on-return + dormant-state
    hint. Verified: 503 gating, 400 validation, request reaches Stripe with a (fake) key, status
    flips enabled:true/false. Live paid txn pending owner's Stripe test keys.
- 2026-06-15 — **DEPLOYED LIVE to https://gymrun.tech** (Hostinger KVM2 VPS, Ubuntu/Paris):
  PostgreSQL+Redis+Node/pm2+Nginx+Let's-Encrypt HTTPS. Verified end-to-end externally
  (login + authed requests). See [[gymflow-deployment]] memory + `DEPLOYMENT.md`.
- 2026-06-15 — **Compete-globally build #1: CRM Sales Pipeline.** Upgraded Leads → full funnel
  (new/contacted/trial/negotiation/won/lost) + deal value + follow-ups + activity timeline
  (note/call/whatsapp/email, auto-advance on first outreach) + convert-to-member (idempotent)
  + pipeline KPIs (conversion rate, follow-ups due, open value). New `lead_activities` table.
  Verified API (lead→member M0002, 100% conversion, re-convert 409) + in-browser board/panel.
- 2026-06-15 — **Compete-globally build #2: Automated Reminders engine.** Retention autopilot —
  renewal (membership expiring ≤7d) + win-back (no check-in 14d) + birthday reminders, delivered
  in-app (targeted Notification → shows in member portal), dedup'd via data.dedupKey, daily `@Cron`
  (@nestjs/schedule) + manual "Run now". WhatsApp/SMS/email channels **config-gated** on provider
  env keys (like Stripe). Staff Automations page (run, channel status, outbox) + nav. Verified:
  renewal generated (1), dedup (2nd run=0), channels off without keys, page renders. Deployed live.
- 2026-06-16 — **Compete-globally build #3: QR check-in + installable member app (PWA).**
  Per-member `checkInToken` (backfilled); member portal shows a **digital QR card**; scanning it
  opens public `/k/[token]` → records attendance (`method=qr`) + shows welcome/validity. App is now
  **installable** (manifest + generated icon + service worker → Add to Home Screen, standalone).
  NOTE: hand-authored the migration (`20260615190000_member_checkin_token`) because `migrate dev`
  refuses non-interactive on a new unique constraint — apply with `migrate deploy`. Verified: token
  check-in (valid/Alice/date), invalid→404, `/k` page in-browser, manifest/icon/sw served. Deployed.
- 2026-06-16 — **Compete-globally build #4: Loyalty Points & Referrals.** `loyalty_entries` ledger
  + per-member referral codes. Auto-earn: +5/check-in (manual + QR), +100 when a referred member
  joins (`referredByCode` on add-member). Member portal loyalty card (balance, referral code,
  history); staff `/loyalty/:id` view + adjust. Verified: referral +100 → check-in +5 →
  `/me/loyalty` shows 105/110 + code; portal card renders. Deployed live. NOTE: hand-authored
  migration `20260616120000_loyalty_referrals`; fixed a DI miss (AttendanceModule imports LoyaltyModule).
- 2026-06-16 — **Compete-globally build #5: Auto-renew billing.** Per-membership auto-renew toggle;
  daily `@Cron` + manual "Run auto-renewals" extends due memberships (reuses `renew`), raises a
  **pending invoice** (revenue only counts once collected — dashboard already filters `status:paid`),
  and notifies the member. Staff "Collect" marks pending paid (`PaymentsService.createPending`/`collect`).
  Web: Renewals auto-renew toggle + run button; Payments "due" badge + Collect. Verified end-to-end:
  run → extended to 2026-07-15 + pending INV-2026-00004 ($35) → collect → paid. No schema change.
  Cash-ready now; flips to auto-charge once Stripe keys arrive.
- 2026-06-16 — **Compete-globally build #6: AI Receptionist.** Config-gated (`ANTHROPIC_API_KEY`,
  like Stripe) Claude chat assistant on the public gym page. New `backend/src/ai/` module
  (`@anthropic-ai/sdk`, model `claude-opus-4-8`, overridable via `AI_MODEL`): answers prospects'
  questions from live gym context (plans + class schedule) and **captures leads** via a `capture_lead`
  tool wired to `LeadsService` (de-duped on phone/email, source `ai_receptionist`). Public endpoints
  `/public/gyms/:slug/ai/{status,chat}`; input capped (≤20 msgs ×2000 chars) to protect the paid API.
  Web: floating chat widget (`apps/web/app/g/[slug]/ai-chat.tsx`) that only renders when configured.
  No schema change. Verified: dormant path (no key → widget hidden, chat returns graceful "offline");
  enabled path (fake key → status flips, request reaches Anthropic, 401 caught gracefully); full
  browser UX (open → greet → send → reply). Goes live once the owner adds an Anthropic key.
- 2026-06-16 — **Pre-launch server hardening (VPS, task #37).** Applied directly on the box,
  live site verified unaffected after each: 2 GB swap (was 0) + swappiness 10; unattended
  security upgrades; **fail2ban** (sshd jail); **daily Postgres backups** (`gymflow-backup.sh`
  → gzip pg_dump to `/opt/backups/gymflow`, 03:15 cron, 7-day retention, first dump verified);
  **Nginx** security headers (HSTS/X-CTO/X-Frame/Referrer-Policy) + per-IP rate limits (`/api/`
  20 r/s burst 50; public AI 2 r/s burst 5; 429 on reject); **key-only SSH** (`PasswordAuthentication
  no`, root `prohibit-password`) — fresh key login re-verified so we're not locked out. Documented
  in DEPLOYMENT.md §8. Still open (app/deploy-level, deferred for local testing): httpOnly
  refresh-token cookie + non-root app user. Task #37 stays in progress until those two land.
