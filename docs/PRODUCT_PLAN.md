# GymFlow Suite — Product & Technical Planning Document

> **Status:** v1.1 (Planning)
> **Owner:** Product / Engineering
> **Last updated:** 2026-06-13
> **Repository:** `gymflow-suite`
> **Positioning:** Commercial SaaS product (sold to gyms) — not internal tooling.

This document is the single source of truth for building **GymFlow Suite**, a multi-platform gym management system. It is written to be handed directly to a development team: every section is meant to be actionable, not aspirational.

### Guiding priorities (non-negotiable)
GymFlow Suite is a **commercial product we will sell to gyms**, so the architecture is chosen for the long haul, not a quick internal tool. Three priorities drive every technical decision in this document:

1. **One language, zero clashes.** The entire system — web, mobile, desktop, and backend — is written in **TypeScript**. There is no second backend language (no PHP/Laravel, no Python). This is deliberate: a single language means shared types, shared validation, and shared business logic across every app, so adding a new app or feature later cannot "collide" with the others. One team can work anywhere in the codebase.
2. **Fast and smooth everywhere.** Performance is a feature, not an afterthought — see [*Engineered for speed*](#engineered-for-speed). Targets: web pages interactive in under ~2s, app screens that open instantly, and a reception check-in that completes in well under a second.
3. **Built to grow.** New apps, new features, and new gyms (multi-tenant) slot in without rewrites, because everything shares one modular core. See [§6](#6-repository-structure).

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users](#2-target-users)
3. [Core Features](#3-core-features)
4. [Platform Strategy](#4-platform-strategy)
5. [Recommended Tech Stack](#5-recommended-tech-stack)
6. [Repository Structure](#6-repository-structure)
7. [Naming Conventions](#7-naming-conventions)
8. [Database Planning](#8-database-planning)
9. [User Roles and Permissions](#9-user-roles-and-permissions)
10. [MVP Version](#10-mvp-version)
11. [Future Features](#11-future-features)
12. [Development Roadmap](#12-development-roadmap)
13. [UI/UX Planning](#13-uiux-planning)
14. [API Planning](#14-api-planning)
15. [Security Planning](#15-security-planning)
16. [SaaS Pricing Model](#16-saas-pricing-model)
17. [Launch Strategy](#17-launch-strategy)
18. [Final Recommendations](#18-final-recommendations)

---

## 1. Product Overview

**GymFlow Suite** is an all-in-one gym management platform that runs on the web, mobile (Android/iOS), and desktop (Windows/Mac). It connects the four people who keep a gym running — owners, staff, trainers, and members — into a single, real-time system.

### What it is
A multi-tenant SaaS product where each gym (or gym chain) gets its own isolated workspace. Within that workspace, staff manage members, plans, payments, and attendance, trainers manage programs and progress, and members manage their own membership and training from their phone.

### The problem it solves
Most small and mid-size gyms run on a patchwork of tools: a paper register or spreadsheet for attendance, WhatsApp for reminders, a cash book for payments, and nothing at all for member engagement. This causes:

- **Revenue leakage** — memberships expire silently, renewals are missed, cash collection is untracked.
- **No visibility** — owners can't answer "how many active members do I have?" or "what's my revenue this month?" without manual counting.
- **Poor member experience** — members don't know their plan status, can't see their workout, and get no reminders.
- **Trainer chaos** — workout and diet plans live in notebooks or chat threads, with no progress history.

GymFlow Suite replaces all of that with one connected system: the front desk checks members in and collects payments, owners see live dashboards and reports, trainers assign and track programs, and members get a polished app for their membership, workouts, and progress.

### Product principles
- **Front-desk first.** The fastest, most reliable surface must be the reception flow — check-in and payment in seconds, even on a flaky connection.
- **Multi-tenant from day one.** Every record is scoped to a gym. This is far cheaper to build correctly now than to retrofit.
- **Offline-tolerant on desktop.** Reception cannot stop working when the internet drops.
- **One backend, many clients.** All platforms talk to the same API. No platform-specific business logic.

---

## 2. Target Users

| User | Primary device | What they care about | Core jobs-to-be-done |
|------|----------------|----------------------|----------------------|
| **Gym Owner** | Web + mobile | Money, growth, retention | "Is my gym healthy? Where is revenue leaking? Who's about to churn?" |
| **Gym Manager** | Web + desktop | Operations, staff, day-to-day | "Are members being served? Are payments collected? Is the team on track?" |
| **Personal Trainer** | Mobile | Their members' results | "What does each of my members need today? Are they progressing?" |
| **Reception Staff** | Desktop | Speed and accuracy | "Check this person in, take their payment, renew them, print the receipt — fast." |
| **Gym Member** | Mobile | Their own fitness & status | "Is my membership active? What's my workout? Am I improving?" |

### Notes per user
- **Gym owners** may own multiple branches (a future feature, but data model must allow it). They want dashboards and reports, not data entry.
- **Gym managers** are owners' delegates — almost all owner powers except billing/ownership and destructive settings.
- **Trainers** spend their day on the gym floor with a phone, not at a desk. The trainer experience is mobile-first.
- **Reception staff** work at a fixed desk, often with a receipt printer and sometimes a barcode/QR scanner. Desktop-first, keyboard-driven, fast.
- **Members** are the largest group and the public face of the product. Their app quality drives retention and word-of-mouth.

---

## 3. Core Features

Features are grouped by the role that primarily uses them. Many are shared across web and desktop.

### Admin / Gym Owner
- **Dashboard** — active members, new joins, expiring/expired memberships, today's check-ins, revenue (today/week/month), outstanding dues, attendance trends.
- **Member management** — create/edit/search members, view full profile, freeze/cancel, assign trainer, membership history.
- **Staff management** — invite staff, assign roles, deactivate, view activity.
- **Trainer management** — onboard trainers, assign members, view trainer load and member outcomes.
- **Membership plans** — define plans (name, duration, price, benefits, class allowance), activate/archive.
- **Payments** — record payments, view invoices, refunds, payment methods, outstanding balances.
- **Attendance tracking** — daily/historical check-in logs, peak-hour analysis, per-member frequency.
- **Reports** — revenue, expenses, profit, membership growth/churn, attendance, trainer performance; export to CSV/PDF.
- **Notifications** — broadcast announcements, automated renewal reminders, targeted messages.
- **Expenses** — record operating costs (rent, salaries, utilities, equipment), categorize.
- **Revenue tracking** — gross/net revenue, MRR, per-plan breakdown, collection vs. billed.

### Trainer
- **Assigned members** — list of members under this trainer with quick status.
- **Workout plans** — build plans from an exercise library, assign to members, schedule.
- **Diet plans** — create meal/macro plans, assign to members.
- **Progress tracking** — record weight, body measurements, performance metrics; view trends.
- **Check-ins** — log/review trainer-member sessions and notes from each session.
- **Member notes** — private notes (injuries, preferences, goals) visible to staff/trainers only.

### Member
- **Membership status** — current plan, start/end date, days remaining, renewal CTA.
- **Attendance history** — personal check-in log and streaks.
- **Workout plan** — assigned program with exercises, sets/reps, and demo media.
- **Diet plan** — assigned meal plan and macros.
- **Progress photos** — upload and compare progress photos over time (private).
- **Payment history** — past payments and downloadable receipts/invoices.
- **Notifications** — renewal reminders, class confirmations, announcements.
- **Class booking** — browse schedule and book/cancel classes.

### Reception
- **Add members** — fast intake form, assign plan, take first payment.
- **Check attendance** — search/scan and check in; show membership-valid/expired banner.
- **Collect payments** — record payment, partial payment, mark dues paid.
- **Renew memberships** — one-click renewal with plan selection and payment.
- **Print receipts** — print/reprint receipts and invoices to a connected printer.

---

## 4. Platform Strategy

**One backend, three client form factors.** Each platform does what its form factor is best at — we do not ship the same UI everywhere.

### Web app — *Management & administration*
The primary surface for owners and managers. Full dashboards, member/staff/trainer management, plans, payments, reports, settings. Built responsive so an owner can also check the dashboard from a tablet or phone browser. This is also where multi-tenant/SaaS administration lives.

### Desktop apps (Windows / Mac) — *The reception desk*
A focused, fast, partly offline-capable app for the front desk. Optimized for:
- Quick member search and check-in (keyboard + QR/barcode scanner).
- Payment collection and renewals.
- **Receipt and invoice printing** (native OS printing — the key reason this is a desktop app and not just the web).
- Daily summary / cash reconciliation at end of shift.
- Tolerates short internet outages: queue check-ins and payments locally, sync when back online.

### Mobile apps (Android / iOS) — *Members & trainers*
Two experiences from one codebase, gated by role after login:
- **Member app** — membership status, workout, diet, progress, payments, notifications, class booking.
- **Trainer app** — assigned members, build/assign plans, log progress and check-ins, notes.

Push notifications (renewals, class reminders, announcements) are a mobile-first capability.

### Why this split
- The web/desktop divide isn't about screen size — it's about **native printing, peripherals (scanners/printers), and offline resilience**, which the desktop shell provides and a browser cannot reliably.
- Trainers and members are mobile, on the floor or out of the gym — a native app with push is the right tool.
- Owners need big screens and rich tables — web is right.

---

## 5. Recommended Tech Stack

The guiding rule: **maximize shared code, minimize the number of languages and paradigms.** A TypeScript-everywhere stack lets one team move across web, mobile, desktop, and backend.

| Layer | Recommendation | Why |
|-------|----------------|-----|
| **Frontend web** | **Next.js (App Router) + React + TypeScript**, Tailwind CSS, TanStack Query, shadcn/ui | SSR/SEO for marketing, mature ecosystem, great DX, shares React with mobile. |
| **Mobile (Android/iOS)** | **React Native + Expo** | Single codebase for both stores, OTA updates, huge ecosystem, shares TS + business logic with web. |
| **Desktop (Win/Mac)** | **Tauri** (preferred) — Rust shell wrapping the web UI; **Electron** as fallback | Tauri ships small, fast, low-memory binaries with native printing and good auto-update. Electron is the safe fallback if the team is unfamiliar with Rust and needs deep Node integration. |
| **Backend** | **NestJS (Node.js + TypeScript)** | Opinionated, modular, first-class DI, guards/interceptors map cleanly to RBAC and multi-tenancy. Same language as the clients. |
| **Database** | **PostgreSQL** | Relational data (members, payments, plans) wants ACID + joins. Row-level multi-tenancy via `gym_id`. Strong JSON support for flexible fields. |
| **Cache / queues** | **Redis** | Session/refresh-token store, rate limiting, and BullMQ job queues (reminders, report generation, notification fan-out). |
| **ORM** | **Prisma** | Type-safe queries shared with TS clients via generated types; clean migrations. |
| **Authentication** | **JWT access + refresh tokens**, argon2 password hashing; optional OAuth (Google) for members | Stateless access tokens scale; refresh tokens in Redis allow revocation. RBAC enforced in NestJS guards. |
| **File storage** | **S3-compatible** (AWS S3 / Cloudflare R2 / MinIO) | Progress photos, exercise media, receipts/invoices. Signed URLs for private member content. |
| **Push notifications** | **Firebase Cloud Messaging (FCM)** for mobile; web push for the web app | Free, cross-platform, integrates with Expo. |
| **Payments** | **Stripe** (cards/subscriptions) + a **pluggable local gateway adapter** (e.g., Razorpay, Paystack, JazzCash/Easypaisa, MercadoPago) | Stripe for global; an adapter interface so local/cash gateways drop in per region. Cash payments recorded manually at reception. |
| **Admin dashboard** | Built into the Next.js web app (role-gated routes), not a separate tool | Owners/managers/super-admins all use role-scoped views of the same app. |
| **Transactional email/SMS** | Resend or Postmark (email); Twilio or a local SMS provider | Receipts, password reset, reminders. |
| **API structure** | **REST** (versioned, `/api/v1`), JSON, OpenAPI/Swagger auto-generated from NestJS | REST is simpler for a CRUD-heavy product and easier for all clients to consume. (GraphQL is a viable alternative — see §14.) |
| **Infra / hosting** | Docker; deploy to a managed platform (Railway/Render/Fly.io) early, migrate to AWS/GCP at scale | Postgres + Redis + S3 are all managed-service friendly. |
| **Observability** | Sentry (errors), structured logs, uptime monitoring | Catch payment/check-in failures fast. |

### Recommended decisions (when in doubt)
- **One language: TypeScript, end to end.** Backend and all clients are TypeScript — **no Laravel/PHP, no Python, no second language.** This is the single most important decision in the document and directly serves the "no clashes" priority (see below). *(Note: a Laragon/PHP setup is not used as the backend; the backend runs on Node.js, and local development uses Node tooling.)*
- **Tauri over Electron** unless the team has zero Rust appetite — the desktop app is mostly the web UI plus printing, which Tauri handles well at a fraction of the footprint. (Tauri's Rust shell is a build-time concern only; app code is still TypeScript.)
- **REST over GraphQL** for v1 — the data is CRUD-shaped and the team velocity is higher with REST + OpenAPI.
- **Expo managed workflow** until a native module forces the bare workflow.
- **Fastify adapter for NestJS** — run NestJS on Fastify (not Express) for materially higher request throughput at no code cost.

### Engineered for speed
Performance is designed in per layer, not bolted on later:

| Layer | Speed tactics |
|-------|---------------|
| **Web** | Next.js App Router with React Server Components (ship less JS), route-level code splitting, image optimization, TanStack Query caching, optimistic updates, edge/CDN caching of static + cacheable API responses. |
| **Mobile** | Hermes engine + new architecture, FlashList for long lists, image caching, prefetch on launch, OTA updates so fixes ship without a store review. |
| **Desktop** | Tauri = tiny binary, low memory, near-instant launch; local cache + offline queue so check-in/payment never wait on the network. |
| **Backend** | NestJS on **Fastify**; **Redis** caching for hot reads (dashboard, member lookup); DB connection pooling; every hot query indexed (§8); pagination everywhere; heavy work (reports, notifications, PDFs) pushed to **background queues** so requests stay fast. |
| **Database** | Composite indexes on tenant + status/date columns; read replicas as traffic grows; no N+1 queries (disciplined Prisma `include`/`select`). |
| **Everywhere** | Measure before optimizing — track p95 latency and Core Web Vitals from day one (Sentry + analytics). |

### One language, no clashes — and adding apps later
Why a single TypeScript codebase won't "collide" as the product grows:
- **Shared contracts.** Types and validation (zod) live once in `packages/shared` and are imported by every app and the backend. Change a field in one place and TypeScript flags every spot that must update — clashes surface at compile time, not in production.
- **Generated API client.** `packages/api-client` is generated from the backend's OpenAPI spec, so no client can drift from the server.
- **Modular backend.** Each domain (members, payments, attendance, …) is its own NestJS module. A new feature is a new module; it doesn't touch the others.
- **Adding a new app is purely additive.** Want a public booking site, a kiosk/self-check-in app, or a smartwatch companion later? Add a folder under `apps/` and reuse `packages/ui`, `shared`, and `api-client`. Nothing existing changes — which is exactly why we use a monorepo (§6).

---

## 6. Repository Structure

### Recommendation: **Monorepo**

Use a single monorepo managed with **pnpm workspaces + Turborepo**.

**Why monorepo (not separate repos):**
- **Shared code is the whole point.** Web, mobile, and desktop all need the same types, API client, validation schemas, and business rules. In separate repos you'd version and publish these as packages — heavy overhead for a small team.
- **Atomic changes.** A backend API change and all client updates land in one PR/commit, so things never drift out of sync.
- **One toolchain.** One lint/test/build config, one CI pipeline, one dependency graph. Turborepo caches builds so CI stays fast.
- **Easier onboarding.** A new developer clones one repo and sees the whole system.

Separate repos only make sense once teams are large and independent enough that coordination cost outweighs sharing — not the case for a new product.

### Proposed structure

```
gymflow-suite/
  apps/
    web/                  # Next.js admin & management web app
    mobile/               # React Native (Expo) member + trainer app
    desktop/              # Tauri reception desk app (wraps shared web UI)
  packages/
    ui/                   # Shared React component library (design system)
    shared/               # Shared types, constants, validation (zod), utils, business logic
    api-client/           # Typed API client + React Query hooks (generated from OpenAPI)
    config/               # Shared ESLint, TS, Tailwind, Prettier configs
  backend/                # NestJS API (own package; Prisma schema lives here)
  database/
    migrations/           # Prisma/SQL migrations
    seeds/                # Seed data (plans, roles, demo gym)
    schema.prisma         # Source of truth for the data model
  docs/                   # This document, ADRs, API docs, runbooks
  scripts/                # Dev/CI/ops scripts (setup, codegen, deploy helpers)
  turbo.json              # Turborepo pipeline
  pnpm-workspace.yaml
  package.json            # Root workspace scripts
  .env.example
  README.md
```

**Notes:**
- `packages/shared` holds **zod schemas** used by both backend (validation) and clients (forms) — one definition, no drift.
- `api-client` is generated from the backend's OpenAPI spec, so client and server types can't diverge.
- The Tauri `desktop` app reuses the web UI components from `packages/ui` and a subset of `apps/web` screens, plus native printing.
- `backend/` could also live under `apps/`; keeping it top-level (as requested) is fine and clearly separates server from clients.

---

## 7. Naming Conventions

| Thing | Convention | Recommended value |
|-------|------------|-------------------|
| **App name (product)** | Brandable, two-word, ".Suite" implies multi-app | **GymFlow Suite** (display) / **GymFlow** (short) |
| **Repository name** | lowercase, kebab-case | **`gymflow-suite`** |
| **Database name** | snake_case, env-suffixed | `gymflow` / `gymflow_dev` / `gymflow_staging` / `gymflow_prod` |
| **Backend service name** | kebab-case service id | `gymflow-api` |
| **Web app folder** | `apps/<name>` | `apps/web` |
| **Mobile app folder** | `apps/<name>` | `apps/mobile` |
| **Desktop app folder** | `apps/<name>` | `apps/desktop` |
| **API routes** | plural nouns, kebab-case, versioned, REST | `/api/v1/members`, `/api/v1/membership-plans`, `/api/v1/payments`, `/api/v1/attendance/check-in` |
| **Environment variables** | UPPER_SNAKE_CASE, prefixed by domain | `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `S3_BUCKET`, `S3_ENDPOINT`, `STRIPE_SECRET_KEY`, `FCM_SERVER_KEY`, `APP_BASE_URL` |

### Code-level conventions
- **DB tables/columns:** `snake_case`, plural tables (`membership_plans`), singular FK columns (`gym_id`, `member_id`).
- **TypeScript:** `PascalCase` for types/components, `camelCase` for variables/functions, `SCREAMING_SNAKE_CASE` for constants.
- **API JSON fields:** `camelCase` in transit (map from snake_case DB in the ORM layer) — pick one and enforce it; consistency matters more than the choice.
- **Branches:** `feat/…`, `fix/…`, `chore/…`. **Commits:** Conventional Commits (`feat(payments): add refund flow`).
- **Env files:** never commit `.env`; always commit `.env.example`.

---

## 8. Database Planning

PostgreSQL. **Every tenant-scoped table carries `gym_id`** for multi-tenancy. All tables get `id` (UUID), `created_at`, `updated_at`; soft-deletable tables also get `deleted_at`. Below, only the notable columns are listed.

> A first-draft `schema.prisma` should be generated from this; treat this section as the design contract.

### `users`
**Purpose:** Every human who can log in — owners, managers, trainers, reception, members. Auth lives here; role/relationship live elsewhere.
Key fields: `id`, `gym_id` (nullable for super_admin), `email` (unique), `phone`, `password_hash`, `full_name`, `avatar_url`, `is_active`, `email_verified_at`, `last_login_at`.

### `gyms`
**Purpose:** The tenant. One row per gym (or branch). Root of multi-tenancy.
Key fields: `id`, `name`, `slug` (unique), `owner_user_id`, `address`, `city`, `country`, `currency`, `timezone`, `logo_url`, `subscription_plan` (SaaS tier), `subscription_status`, `parent_gym_id` (nullable — for future multi-branch).

### `roles`
**Purpose:** Defines the role catalog and permission sets (RBAC). Can be seeded as fixed roles or made configurable per gym.
Key fields: `id`, `gym_id` (null = system/global role), `name` (`super_admin`, `gym_owner`, `gym_manager`, `trainer`, `receptionist`, `member`), `permissions` (JSON array of permission keys), `is_system`.
*A join table `user_roles (user_id, role_id, gym_id)` assigns roles to users — supports a user holding different roles in different gyms.*

### `members`
**Purpose:** Member profile and gym-specific data. Links to a `users` row (a member can log into the mobile app).
Key fields: `id`, `gym_id`, `user_id` (nullable for walk-ins without an account), `member_code` (human-friendly/QR id), `date_of_birth`, `gender`, `emergency_contact`, `health_notes`, `assigned_trainer_id` (→ trainers), `status` (`active`/`frozen`/`expired`/`cancelled`), `joined_at`.

### `trainers`
**Purpose:** Trainer profile and gym employment data. Links to a `users` row.
Key fields: `id`, `gym_id`, `user_id`, `specialization`, `bio`, `certifications` (JSON), `hourly_rate` (optional), `is_active`.

### `staff`
**Purpose:** Non-trainer employees (managers, receptionists, others). Links to a `users` row.
Key fields: `id`, `gym_id`, `user_id`, `position`, `employment_type`, `hired_at`, `is_active`.

### `membership_plans`
**Purpose:** The catalog of plans a gym sells.
Key fields: `id`, `gym_id`, `name`, `description`, `duration_days` (or `duration_months`), `price`, `currency`, `class_credits` (nullable = unlimited), `benefits` (JSON), `is_active`.

### `memberships`
**Purpose:** A purchased instance of a plan for a member (the subscription). Drives "is this member active?"
Key fields: `id`, `gym_id`, `member_id`, `plan_id`, `start_date`, `end_date`, `status` (`active`/`expired`/`frozen`/`cancelled`), `price_paid`, `auto_renew`, `created_by` (staff user).

### `payments`
**Purpose:** Money received (or due). One row per transaction; ties to a membership when relevant.
Key fields: `id`, `gym_id`, `member_id`, `membership_id` (nullable), `amount`, `currency`, `method` (`cash`/`card`/`online`/`bank`), `status` (`paid`/`pending`/`partial`/`refunded`/`failed`), `gateway` (`stripe`/`razorpay`/`cash`/…), `gateway_ref`, `paid_at`, `invoice_number`, `collected_by` (staff user).

### `attendance`
**Purpose:** Check-in (and optional check-out) log. High-volume; index on `(gym_id, member_id, checked_in_at)`.
Key fields: `id`, `gym_id`, `member_id`, `checked_in_at`, `checked_out_at` (nullable), `method` (`manual`/`qr`/`biometric`), `recorded_by` (staff user, nullable for self check-in).

### `workout_plans`
**Purpose:** A training program assigned to a member by a trainer.
Key fields: `id`, `gym_id`, `member_id`, `trainer_id`, `title`, `goal`, `start_date`, `end_date`, `notes`, `is_active`.

### `workout_exercises`
**Purpose:** Line items within a workout plan (and an exercise library reference).
Key fields: `id`, `workout_plan_id`, `exercise_id` (→ optional `exercises` library table), `name`, `day_of_week`/`day_index`, `sets`, `reps`, `rest_seconds`, `weight`, `notes`, `media_url`, `order`.

### `diet_plans`
**Purpose:** A nutrition plan assigned to a member by a trainer. Meals can be a JSON structure or a child `diet_meals` table.
Key fields: `id`, `gym_id`, `member_id`, `trainer_id`, `title`, `target_calories`, `macros` (JSON: protein/carbs/fat), `meals` (JSON or child table), `start_date`, `end_date`, `notes`.

### `progress_records`
**Purpose:** Time-series of a member's measurements and progress photos.
Key fields: `id`, `gym_id`, `member_id`, `recorded_by` (trainer/member), `recorded_at`, `weight`, `body_fat_pct`, `measurements` (JSON: chest/waist/arms/…), `photo_urls` (JSON array), `notes`.

### `classes`
**Purpose:** Scheduled group classes (yoga, spin, etc.) with capacity.
Key fields: `id`, `gym_id`, `trainer_id`, `title`, `description`, `starts_at`, `ends_at`, `capacity`, `location`, `recurrence_rule` (nullable), `is_cancelled`.

### `bookings`
**Purpose:** A member's reservation for a class. Enforces capacity; unique `(class_id, member_id)`.
Key fields: `id`, `gym_id`, `class_id`, `member_id`, `status` (`booked`/`attended`/`cancelled`/`no_show`), `booked_at`.

### `notifications`
**Purpose:** Messages to users (in-app + push/email/SMS), and announcements.
Key fields: `id`, `gym_id`, `user_id` (nullable for broadcast), `type` (`renewal`/`announcement`/`class`/`payment`/…), `title`, `body`, `channel` (`push`/`email`/`sms`/`in_app`), `data` (JSON), `read_at`, `sent_at`.

### `expenses`
**Purpose:** Operating costs for owner financial reports.
Key fields: `id`, `gym_id`, `category` (`rent`/`salary`/`utilities`/`equipment`/`other`), `amount`, `currency`, `description`, `incurred_on`, `recorded_by`, `receipt_url`.

### `audit_logs`
**Purpose:** Immutable record of sensitive actions (payments, refunds, role changes, deletions) for security and dispute resolution.
Key fields: `id`, `gym_id`, `actor_user_id`, `action` (e.g., `payment.refunded`), `entity_type`, `entity_id`, `before` (JSON), `after` (JSON), `ip_address`, `user_agent`, `created_at`. **Append-only — never updated or deleted.**

### Key relationships (summary)
- `gyms 1—* users / members / trainers / staff / plans / memberships / payments / …` (everything is scoped to a gym)
- `members 1—* memberships`, `memberships 1—* payments`
- `members 1—* attendance`, `progress_records`, `bookings`
- `trainers 1—* workout_plans / diet_plans`; `members 1—* workout_plans / diet_plans`
- `workout_plans 1—* workout_exercises`
- `classes 1—* bookings`
- `users *—* roles` via `user_roles`

### Indexing & integrity notes
- Composite indexes on `(gym_id, status)` for members/memberships, `(gym_id, member_id, checked_in_at)` for attendance, `(gym_id, paid_at)` for payments.
- Foreign keys with `ON DELETE RESTRICT` for financial records; soft-delete members instead of hard delete.
- Enforce tenant isolation in the data-access layer (every query filtered by `gym_id`); consider Postgres Row-Level Security as defense in depth.

---

## 9. User Roles and Permissions

RBAC with a fixed set of roles. Permissions are checked in the backend (NestJS guards) on every request — never trust the client. A user can hold a role per gym (via `user_roles`).

| Capability | Super Admin | Gym Owner | Gym Manager | Trainer | Receptionist | Member |
|---|---|---|---|---|---|---|
| Manage all gyms / SaaS billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gym settings & branding | ✅ | ✅ | ⚠️ limited | ❌ | ❌ | ❌ |
| View owner dashboard & financial reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage membership plans & pricing | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage staff & assign roles | ✅ | ✅ | ⚠️ (not owners) | ❌ | ❌ | ❌ |
| Manage trainers & assignments | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Add/edit members | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Collect payments / refunds | ✅ | ✅ | ✅ | ❌ | ✅ (refund ⚠️) | ❌ |
| Renew memberships | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Record/print attendance & receipts | ✅ | ✅ | ✅ | ❌ | ✅ | self only |
| Create workout/diet plans | ✅ | ✅ | ✅ | ✅ (own members) | ❌ | ❌ |
| Record member progress | ✅ | ✅ | ✅ | ✅ (own members) | ❌ | self only |
| View member notes/health data | ✅ | ✅ | ✅ | ✅ (own members) | ⚠️ basic | own only |
| Book classes | ✅ | ✅ | ✅ | ❌ | ✅ (on behalf) | ✅ (self) |
| View own membership/workout/payments | n/a | n/a | n/a | n/a | n/a | ✅ |
| Delete records / hard delete | ✅ | ⚠️ soft only | ❌ | ❌ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ⚠️ limited | ❌ | ❌ | ❌ |

Legend: ✅ allowed · ⚠️ partial/conditional · ❌ denied

### Role descriptions
- **Super Admin (platform/us):** Operates the SaaS itself. Manages all tenant gyms, subscription billing, platform config, and cross-gym support. Cannot be assigned by a gym. Should be a tiny, tightly controlled set of accounts.
- **Gym Owner:** Full control of their gym(s) — finances, staff, plans, settings. Cannot touch other gyms or platform billing internals. Can soft-delete but not hard-delete (audit safety).
- **Gym Manager:** Runs day-to-day operations with almost all owner powers, **except**: cannot manage the owner's account, change ownership, alter SaaS subscription, or perform destructive deletes. Can manage staff below them.
- **Trainer:** Scoped to **their assigned members only**. Creates/assigns workout & diet plans, records progress, logs check-in sessions, reads member health notes for their members. No financial or admin access.
- **Receptionist:** The front-desk operator. Adds members, checks attendance, collects payments, renews memberships, prints receipts. **Cannot** see full financial reports, manage plans/staff, or issue refunds without manager approval (configurable). Read-only on most member health data.
- **Member:** Sees and manages **only their own** data — membership, attendance, workout, diet, progress, payments, class bookings. No access to other members or any admin function.

---

## 10. MVP Version (v1)

**Goal:** A single-gym, single-branch product that lets a real gym run its core operations end to end. Ship something a local gym would pay for, not a tech demo. Keep multi-tenant plumbing in place but defer multi-branch.

### In scope for MVP
1. **Login & auth** — email/password, JWT, password reset, role-gated access.
2. **Gym setup** — create gym, set name/logo/currency/timezone, invite first staff.
3. **Add members** — intake form, member profile, member code/QR.
4. **Membership plans** — create/edit plans (name, duration, price).
5. **Memberships** — assign a plan to a member, compute start/end + status.
6. **Member attendance** — manual/searched check-in with active/expired banner; daily log.
7. **Payment tracking** — record payments (cash + one online gateway), receipts, outstanding dues.
8. **Basic dashboard** — active members, expiring soon, today's check-ins, revenue this month.
9. **Member mobile app (basic)** — login, membership status, attendance history, assigned workout (read-only), payment history, notifications.
10. **Trainer basic access** — see assigned members, create & assign a simple workout plan, record basic progress.

### Platforms in MVP
- **Web** — admin/management + dashboard (primary build).
- **Desktop reception** — can ship as a thin Tauri wrapper of the web check-in/payment flow for v1; full offline mode can wait to v1.1.
- **Mobile** — member app + minimal trainer access.

### Explicitly NOT in MVP
Class booking, diet plans (full), progress photos comparison, expenses/advanced reports, refunds workflow, QR/biometric scanning, automated reminders, multi-branch, payroll, inventory, store, leads. (See §11.)

### MVP definition of done
A receptionist can add a member, sell a plan, take payment, print/share a receipt, and check them in tomorrow — while the owner sees it all on the dashboard and the member sees their status on their phone.

---

## 11. Future Features (post-MVP, roughly prioritized)

| Feature | Value | Notes |
|---|---|---|
| **QR code attendance** | High | Member code as QR; scan at desk or self-scan kiosk. Low effort, high delight. |
| **Automated renewal reminders** | High | Cron + queue: notify members N days before expiry via push/SMS/email. Directly reduces churn. |
| **WhatsApp reminders** | High | WhatsApp Business API for renewals/announcements — huge in many markets. |
| **Online class booking** | High | Full schedule, capacity, waitlists, member self-booking. |
| **Progress analytics** | Medium | Charts for member progress and gym-wide trends. |
| **Multi-branch gyms** | Medium | `parent_gym_id` already in schema; add branch switching, consolidated reports. |
| **AI workout recommendations** | Medium | Suggest/auto-generate plans from goals, history, and the exercise library. |
| **AI diet suggestions** | Medium | Generate meal plans from targets and preferences. |
| **Lead management (CRM)** | Medium | Capture prospects, trials, follow-ups, conversion funnel. |
| **Biometric attendance** | Medium | Fingerprint/face device integration; region-dependent. |
| **Staff payroll** | Low-Med | Salaries, attendance-based pay, payslips. |
| **Inventory** | Low | Track equipment and stock. |
| **Supplements store** | Low | In-app catalog + checkout; ties to payments. |

---

## 12. Development Roadmap

Phased plan. Phases overlap in practice, but each has a clear deliverable. Assumes a small team (2–4 devs).

### Phase 1 — Planning & UI/UX
- Finalize this document; lock MVP scope.
- Define data model and ERD; review §8 schema.
- Wireframe all MVP screens (web, mobile, desktop) — low then high fidelity.
- Build the design system foundation in `packages/ui` (tokens, core components).
- Set up monorepo: pnpm + Turborepo, shared config, CI skeleton.
**Deliverable:** approved designs, ERD, scaffolded monorepo.

### Phase 2 — Backend & database
- Stand up NestJS + Prisma + Postgres + Redis; Docker compose for local dev.
- Implement multi-tenancy (gym scoping), auth (JWT + refresh), RBAC guards.
- Implement core modules: users, gyms, roles, members, plans, memberships, payments, attendance.
- Seed data (roles, demo gym, plans); OpenAPI spec; generate `api-client`.
- Unit/integration tests on auth + payments.
**Deliverable:** documented, tested API for all MVP entities.

### Phase 3 — Web admin dashboard
- Auth flows, role-gated routing.
- Members CRUD + profile; plans; memberships; payments; attendance views.
- Owner dashboard (active members, expiring, check-ins, revenue).
- Staff/trainer management; settings.
**Deliverable:** owners/managers can run the gym from the web.

### Phase 4 — Desktop reception app
- Tauri shell wrapping the reception flows (search, check-in, collect payment, renew).
- Native receipt/invoice printing; barcode/QR scanner input.
- Daily summary / cash reconciliation.
- (v1.1) Offline queue + sync.
**Deliverable:** front desk runs entirely on the desktop app.

### Phase 5 — Mobile member/trainer app
- Expo app, auth, role-based home.
- Member: membership status, attendance, workout (read), payments, notifications.
- Trainer: assigned members, create/assign workout, record progress.
- Push notification registration (FCM).
**Deliverable:** members and trainers live on their phones.

### Phase 6 — Payments, notifications, reports
- Stripe + one local gateway via the adapter; webhooks; receipts/invoices (PDF to S3).
- Automated renewal reminders (BullMQ + cron); announcement broadcasts.
- Reports: revenue, expenses, membership growth/churn, attendance; CSV/PDF export.
- Expenses module; revenue tracking.
**Deliverable:** money + comms + insights fully working.

### Phase 7 — Testing & launch
- E2E tests (Playwright web, Detox/Maestro mobile); load test check-in/payment.
- Security review (see §15); pen-test the auth/payment paths.
- Beta with 2–3 local gyms; fix from feedback.
- App store submissions (iOS/Android), desktop installers + auto-update, web production deploy.
- Monitoring, backups, runbooks, support process.
**Deliverable:** GA launch.

---

## 13. UI/UX Planning

Design principles: clarity over density for owners, **speed over everything** for reception, and motivation/simplicity for members. One design system (`packages/ui`) shared across platforms.

### Web dashboard — screens
- **Login** — email/password, forgot password, gym branding.
- **Dashboard** — KPI cards (active members, expiring soon, today's check-ins, revenue MTD), trend charts, quick actions.
- **Members** — searchable/filterable table (status, plan, expiry), bulk actions, "Add member".
- **Member profile** — overview, membership history, payments, attendance, assigned trainer, plans, notes, progress.
- **Payments** — transactions list, filters, record payment, invoices, outstanding dues.
- **Attendance** — daily log, calendar/heatmap, per-member history, peak hours.
- **Trainers** — trainer list, load, assigned members, performance.
- **Plans** — plan catalog, create/edit, activate/archive.
- **Reports** — revenue/expense/profit, growth/churn, attendance, export.
- **Settings** — gym profile, staff & roles, branding, payment gateways, notifications.

### Mobile app — screens
- **Login** — email/phone + password, social login (members).
- **Home** — membership status card, days remaining, next class, quick links, notifications badge.
- **Membership** — current plan details, renew CTA, payment history.
- **Workout** — assigned plan, today's exercises, sets/reps, demo media, mark complete.
- **Diet** — assigned meal plan, macros, daily meals.
- **Progress** — weight/measurements charts, progress photos timeline, add entry.
- **Notifications** — reminders, announcements, class confirmations.
- **Profile** — personal info, settings, logout. *(Trainer build swaps Home for "My Members" and adds plan-builder screens.)*

### Desktop app — screens (reception, keyboard-first)
- **Login** — staff login; remember device.
- **Quick member search** — instant search by name/phone/code/QR; big result cards with status banner.
- **Attendance check-in** — one-tap/scan check-in; green (valid) / red (expired) banner; recent check-ins feed.
- **Payment collection** — select member → amount/method → confirm → done.
- **Receipt printing** — auto-print on payment; reprint last; invoice view.
- **Daily summary** — today's check-ins, payments collected, cash reconciliation, end-of-shift report.

---

## 14. API Planning

**REST, versioned under `/api/v1`.** JSON request/response, JWT bearer auth, every request implicitly scoped to the caller's gym (super-admin can pass `gym_id`). OpenAPI/Swagger auto-generated. Standard conventions: cursor or page-based pagination, `?filter[...]`, `?sort=`, consistent error envelope, idempotency keys on payment writes.

### Auth
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
GET    /api/v1/auth/me
```

### Users / Staff / Roles
```
GET    /api/v1/users
POST   /api/v1/users                 # invite staff/trainer
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id             # soft-deactivate
GET    /api/v1/roles
POST   /api/v1/users/:id/roles       # assign role
```

### Members
```
GET    /api/v1/members               # search/filter/paginate
POST   /api/v1/members
GET    /api/v1/members/:id
PATCH  /api/v1/members/:id
DELETE /api/v1/members/:id           # soft delete
GET    /api/v1/members/:id/attendance
GET    /api/v1/members/:id/payments
GET    /api/v1/members/:id/progress
POST   /api/v1/members/:id/notes
```

### Memberships & Plans
```
GET    /api/v1/membership-plans
POST   /api/v1/membership-plans
PATCH  /api/v1/membership-plans/:id
GET    /api/v1/memberships
POST   /api/v1/memberships           # assign plan to member
POST   /api/v1/memberships/:id/renew
POST   /api/v1/memberships/:id/freeze
POST   /api/v1/memberships/:id/cancel
```

### Payments
```
GET    /api/v1/payments
POST   /api/v1/payments              # record (cash/online); idempotent
GET    /api/v1/payments/:id
POST   /api/v1/payments/:id/refund
GET    /api/v1/payments/:id/receipt  # PDF
POST   /api/v1/payments/webhook/:gateway   # gateway callbacks
```

### Attendance
```
POST   /api/v1/attendance/check-in   # { memberId | memberCode | qr }
POST   /api/v1/attendance/check-out
GET    /api/v1/attendance            # filter by date/member
GET    /api/v1/attendance/summary    # daily summary
```

### Trainers
```
GET    /api/v1/trainers
POST   /api/v1/trainers
GET    /api/v1/trainers/:id/members
POST   /api/v1/trainers/:id/assign   # assign member to trainer
```

### Workouts & Diet
```
GET    /api/v1/workout-plans?memberId=
POST   /api/v1/workout-plans
PATCH  /api/v1/workout-plans/:id
POST   /api/v1/workout-plans/:id/exercises
GET    /api/v1/diet-plans?memberId=
POST   /api/v1/diet-plans
PATCH  /api/v1/diet-plans/:id
GET    /api/v1/exercises              # exercise library
```

### Classes & Bookings (post-MVP)
```
GET    /api/v1/classes
POST   /api/v1/classes
POST   /api/v1/classes/:id/book
DELETE /api/v1/bookings/:id
```

### Reports & Dashboard
```
GET    /api/v1/dashboard              # KPI summary for home
GET    /api/v1/reports/revenue?from=&to=
GET    /api/v1/reports/expenses?from=&to=
GET    /api/v1/reports/membership-growth
GET    /api/v1/reports/attendance
GET    /api/v1/reports/:type/export?format=csv|pdf
```

### Notifications & Expenses
```
GET    /api/v1/notifications
POST   /api/v1/notifications/broadcast
PATCH  /api/v1/notifications/:id/read
POST   /api/v1/devices                # register FCM token
GET    /api/v1/expenses
POST   /api/v1/expenses
```

**Error envelope (example):**
```json
{ "error": { "code": "MEMBERSHIP_EXPIRED", "message": "Membership expired on 2026-05-01", "details": {} } }
```

> **GraphQL alternative:** if mobile needs flexible, nested fetches (member + membership + workout + progress in one round-trip), expose a GraphQL gateway over the same services. For v1's CRUD workload, REST is simpler and recommended.

---

## 15. Security Planning

Gyms hold personal data (health notes, photos, payments) — treat security as a feature, not an afterthought.

- **Authentication:** Email/password with **argon2id** hashing (never MD5/SHA-1, never plaintext). Email verification; rate-limited login; account lockout/backoff on repeated failures. Optional 2FA for owner/admin accounts.
- **JWT / session strategy:** Short-lived **access tokens** (~15 min) + longer **refresh tokens** stored server-side in Redis (rotated on use, revocable on logout/compromise). Tokens carry `userId`, `gymId`, and role claims; signed with rotating secrets. Never store JWTs in localStorage on web — use httpOnly secure cookies for web, secure storage on mobile/desktop.
- **Role-based access control:** Enforced server-side in NestJS guards on every endpoint — clients only hide UI, they never gate data. Every query is scoped by `gym_id`; consider Postgres **Row-Level Security** as defense in depth so a missing filter can't leak across tenants.
- **Member privacy:** Health notes and progress photos are private — served via **time-limited signed URLs**, never public buckets. Members see only their own data; trainers see only assigned members. Provide data export/delete to support GDPR-style requests. Encrypt sensitive columns at rest where feasible; TLS everywhere in transit.
- **Payment security:** **Never store raw card data** — delegate to Stripe/gateway (PCI scope stays with them). Use tokenized payments and verify **webhook signatures**. Idempotency keys on payment creation. All payment and refund actions written to `audit_logs`.
- **Audit logs:** Append-only record of sensitive actions (payments, refunds, role changes, deletions, logins) with actor, before/after, IP, and user agent. Used for disputes and incident response.
- **Data backups:** Automated daily Postgres backups with point-in-time recovery; periodic restore drills (an untested backup is not a backup); S3 versioning + lifecycle for files; backups encrypted and access-controlled.
- **General hardening:** Validate all input with zod/DTOs; parameterized queries via Prisma (no SQL injection); rate limiting and CORS allowlist; secrets in a secrets manager (never in git); dependency scanning + Sentry alerting; principle of least privilege for service accounts.

---

## 16. SaaS Pricing Model

Per-gym subscription, billed monthly or annually (annual discount ~2 months free). Pricing scales with **active members** and feature tiers. Numbers below are illustrative starting points — validate against your market and currency; many regions will price 40–70% lower.

| | **Starter** | **Professional** | **Enterprise** |
|---|---|---|---|
| **Price (USD/mo)** | $29 | $79 | $199+ (custom) |
| **Target customer** | New / small single-location gym | Established single gym or small studio chain | Multi-branch gyms & franchises |
| **Active members** | up to 150 | up to 750 | unlimited |
| **Staff/trainer seats** | 3 | 15 | unlimited |
| **Branches** | 1 | 1 | multi-branch |
| **Web dashboard** | ✅ | ✅ | ✅ |
| **Desktop reception app** | ✅ | ✅ | ✅ |
| **Member & trainer mobile apps** | ✅ | ✅ | ✅ |
| **Plans, payments, attendance** | ✅ | ✅ | ✅ |
| **Reports** | Basic | Advanced + export | Advanced + custom |
| **Automated renewal reminders** | ❌ | ✅ | ✅ |
| **WhatsApp / SMS reminders** | ❌ | Add-on | ✅ |
| **Class booking** | ❌ | ✅ | ✅ |
| **AI workout/diet suggestions** | ❌ | Add-on | ✅ |
| **Multi-branch consolidated reports** | ❌ | ❌ | ✅ |
| **Payroll / inventory / store** | ❌ | ❌ | ✅ (modules) |
| **Support** | Email | Priority email | Dedicated + SLA |
| **API access** | ❌ | Limited | Full |

**Add-ons (any tier):** extra members/seats, SMS/WhatsApp message credits, biometric device integration, white-label branding.
**Billing notes:** 14-day free trial, no card required to start; payment failure → grace period then read-only lock (data never deleted); annual plans get a discount. Take payment via Stripe Billing where available, local gateway otherwise.

---

## 17. Launch Strategy

1. **Start hyper-local.** Hand-onboard **3–5 gyms you can visit in person.** In-person onboarding surfaces real workflow gaps faster than any survey.
2. **Free/discounted beta.** Give beta gyms free use in exchange for honest feedback and the right to use them as references. Set expectations: "early product, fast fixes, your input shapes it."
3. **Instrument and observe.** Track activation (gym set up → first member → first payment → first check-in), feature usage, and crash/error rates. Sit at a reception desk during peak hours and watch.
4. **Tight feedback loop.** Weekly check-ins with beta gyms; ship fixes fast; show them their requests landing — this turns beta users into advocates.
5. **Build case studies.** Once a gym sees a win (recovered renewals, time saved at the desk, clearer revenue), document it with numbers. "Gym X cut missed renewals by 30%."
6. **Collect testimonials.** Short video/quote from owners and front-desk staff — these convert other gym owners better than feature lists.
7. **Expand by referral + niche.** Gym owners know other gym owners. Offer referral incentives. Target a niche first (e.g., independent strength gyms in one city) before going broad.
8. **Then scale marketing.** Only after the product is sticky with beta gyms: content (gym-ops guides), local fitness expos, partnerships with equipment vendors, app-store presence for the member apps.
9. **Iterate on real usage.** Let actual usage — not the roadmap — reprioritize §11. The feature beta gyms beg for is your next build.

---

## 18. Final Recommendations

**Best repository name:** `gymflow-suite` — descriptive, brandable, signals a multi-app suite, and matches the product name. (Of the alternatives, `gympilot` and `gymcore` are the strongest backups.)

**Best app name:** **GymFlow** (product: *GymFlow Suite*) — easy to say, on-brand for fitness, available-sounding, and pairs cleanly with sub-apps (GymFlow Desk, GymFlow Go).

**Best tech stack:** TypeScript end-to-end —
- **Web:** Next.js + React + Tailwind + TanStack Query
- **Mobile:** React Native + Expo
- **Desktop:** Tauri (Electron only if the team avoids Rust)
- **Backend:** NestJS + Prisma + **PostgreSQL** + Redis
- **Storage:** S3-compatible (R2/S3) · **Push:** FCM · **Payments:** Stripe + pluggable local gateway
- **Monorepo:** pnpm + Turborepo
The single-language choice is the highest-leverage decision: it lets a small team work across every surface and share types, validation, and the API client.

**Best MVP:** Single-gym core loop — login → gym setup → add members → plans → memberships → attendance check-in → payment + receipt → basic owner dashboard, plus a read-mostly member mobile app and minimal trainer access. Ship this to one real gym before building anything else.

**Best first platform to build:** **Web admin dashboard first** (it exercises the full backend and gives owners immediate value), then the **desktop reception app** (a thin Tauri wrapper of the web check-in/payment flows), then the **mobile apps**. Reasoning: the web app validates your data model and API end to end, and reception is where the product earns trust on day one.

### Mistakes to avoid
- **Don't retrofit multi-tenancy.** Put `gym_id` on every tenant table from commit one. Adding it later is a painful migration.
- **Don't build all platforms at once.** Web → desktop → mobile, sequentially. Parallel platform work on an unstable API wastes effort.
- **Don't gate security in the UI.** Enforce RBAC and tenant scoping in the backend; the client only hides what it can't show.
- **Don't store card data or skip webhook signature checks.** Keep PCI scope with Stripe/the gateway.
- **Don't over-scope the MVP.** Class booking, AI, payroll, store, biometrics are §11, not v1. Resist feature creep until one gym is happy.
- **Don't ignore offline at the front desk.** Even a simple local queue for check-ins/payments prevents the worst failure mode (gym can't operate when WiFi drops).
- **Don't skip the audit log and backups.** The first payment dispute or accidental deletion will prove their worth.
- **Don't build in a vacuum.** Onboard a real gym early; their workflow will correct your assumptions.

---

*End of document. Treat §8 (schema), §9 (RBAC), and §10 (MVP) as the contract for Phase 1–2 implementation. Open ADRs in `docs/` for any deviation.*
