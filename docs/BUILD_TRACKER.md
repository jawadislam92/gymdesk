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
- [ ] **Digital contracts & e-signature**, liability waivers (B/C/D) 🔌
- [ ] **Lead capture** (web form, walk-in, QR) + **sales pipeline / leads board** (B)
- [ ] Lead follow-up automation (tasks + reminders) (B)
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
- [ ] **Stripe integration** — online card payments (B/C) 🔌
- [ ] **Recurring billing / subscriptions** (auto-charge) (B/C) 🔌
- [ ] Failed-payment recovery / dunning (B) 🔌
- [ ] Branded **PDF invoices & receipts** + tax/VAT (B/C)
- [ ] Local gateway adapter (Razorpay / JazzCash / Easypaisa / Paystack) (B/C) 🔌
- [ ] Discounts / coupons / promo codes (B/C/D)

### A4. Member Portal (Surface C — web)
- [x] Member login + "my membership" status & days remaining (C)
- [x] **Book / cancel classes** myself (C)
- [x] Payment history (receipt PDFs tracked under A3) (C)
- [ ] My workouts (read) + my progress (C)
- [ ] Profile, notifications, QR check-in code (C)
- [x] Member login/invite flow: staff "Create login" on member profile → sets
      credentials + assigns `member` role (B/C)

### A5. Public / Marketing (Surface D — web)
- [ ] **GymFlow marketing website** (landing, features, pricing, sign-up) (D)
- [ ] **Per-gym public page**: public schedule, join online, buy membership, book a trial (D)
- [ ] Embeddable booking widget (D)

### A6. Communications
- [ ] Email sending (Resend/Postmark) — receipts, reminders, resets (B/C) 🔌
- [ ] SMS (Twilio / local) (B/C) 🔌
- [ ] In-app + push notifications (FCM) (B/C) 🔌
- [ ] Automated renewal / expiry reminders (BullMQ cron) (B)

### A7. Reporting (deepen)
- [x] Revenue / membership-growth / attendance charts + CSV (B)
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
- [ ] Workout program builder + exercise library (video) (B/C)
- [ ] Nutrition / diet plans + macros (B/C)
- [ ] Progress (measurements, body-fat, photos), PR/benchmark tracking (B/C)
- [ ] Wearable / health-app sync (C) 🔌
### B4. Marketing automation
- [ ] Email/SMS campaign builder + drip automations + segments (B) 🔌
- [ ] Promotions, seasonal campaigns, social lead-ad integration (B/D) 🔌
### B5. Access control & POS
- [ ] QR + kiosk self check-in; door access integration (B) 🔌
- [ ] Live occupancy; guest/day passes (B/C)
- [ ] POS / retail + inventory (B)
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
- [ ] **The "online move":** managed Postgres/Redis (Neon/Upstash/Railway), deploy, backups 🔌
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
