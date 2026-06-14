# GymFlow Suite — Project Context & Session Handoff

> **Read this first.** It captures every decision and the current state so any new session can continue without re-explaining. The full spec is in [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) — that is the source of truth.

## What this project is
- **GymFlow Suite** — a commercial, multi-platform **gym management SaaS** (Web, Android, iOS, Windows, Mac) sold to gym owners, managers, trainers, reception staff, and members.
- This is a **product to launch and sell** (by Sparking Asia, a service-based company) — **not** internal tooling.
- The owner is **non-technical** and expects Claude to do the implementation **end to end**. Explain things in plain language; do the building.

## Locked decisions — do NOT relitigate these
1. **One language: TypeScript, end to end.** Backend and all clients are TypeScript. **No Laravel/PHP, no Python, no second language.** (The owner uses Laragon locally, but it is **not** the backend — the backend runs on Node.js.) Reason: avoid language clashes when adding apps/features later.
2. **Tech stack:**
   - Web: **Next.js** (App Router) + React + Tailwind + TanStack Query
   - Mobile: **React Native + Expo**
   - Desktop: **Tauri** (Electron only if Rust is a dealbreaker)
   - Backend: **NestJS on Fastify** + **Prisma** + **PostgreSQL** + **Redis**
   - Storage: **S3-compatible** (R2/S3) · Push: **FCM** · Payments: **Stripe** + pluggable local gateway adapter
   - API: **REST**, versioned `/api/v1`, OpenAPI-generated client
3. **Monorepo** with **pnpm workspaces + Turborepo**. Structure in PRODUCT_PLAN.md §6.
4. **Multi-tenant from day one** — every tenant table carries `gym_id`.
5. **Priorities (non-negotiable):** one language / no clashes · speed (designed in per layer) · additive extensibility.
6. **Naming:** repo `gymflow-suite`, product **GymFlow Suite**, DB `gymflow`, service `gymflow-api`. (This repo is currently named `gymdesk`.)

## Current status (as of 2026-06-14)
- ✅ Planning complete: `docs/PRODUCT_PLAN.md` (v1.1) + `README.md` + this `CLAUDE.md`. Planning docs are pushed to `github.com/jawadislam92/gymdesk`.
- ✅ **Monorepo scaffolded and verified** (branch `feat/scaffold-monorepo`):
  - Root: pnpm workspaces + Turborepo + shared TS base (`tsconfig.base.json`) + Prettier via `@gymflow/config`.
  - `packages/shared` — role catalog, RBAC permission map (§9), status enums, and zod schemas (auth/member/plan). Builds to `dist`.
  - `backend` (`gymflow-api`) — NestJS 11 on **Fastify**, Prisma 6, global `/api/v1` prefix, Swagger UI at `/api/docs`, global Zod validation pipe, `PrismaModule` that tolerates a missing DB at boot, and `/api/v1/health`.
  - **Full Prisma schema** (`backend/prisma/schema.prisma`) — every §8 model + enums, multi-tenant `gym_id`, the §8 indexes, soft-delete columns; `prisma validate` passes.
  - Seed (`backend/prisma/seed.ts`) — system roles + a demo gym/owner/plans (`owner@demo.gym` / `Password123!`).
  - **Verified:** `pnpm install` clean; backend builds; boots and listens on :4000; `GET /api/docs` → 200.
- ✅ **Database is live (local Postgres 16.6).** `init` migration applied (22 tables), seed loaded (6 roles + demo gym/owner/plans). `GET /api/v1/health` → `database:"up"`.
- ✅ **Auth + RBAC live.** `AuthModule`: `register`/`login`/`refresh`/`logout`/`me`; argon2id hashing; JWT access + refresh with **Redis-backed rotation/revocation**; global `JwtAuthGuard` + `PermissionsGuard` with `@Public` / `@RequirePermissions` / `@CurrentUser` / `@GymId`. Permissions come from the seeded roles.
- ✅ **Core feature modules live & verified end-to-end** (gym-scoped, RBAC-guarded, §14 routes): **members** (CRUD, auto code `M0001…`, search, soft-delete; identity on linked `User`), **membership-plans** (CRUD/archive), **memberships** (assign/renew/freeze/cancel + member status), **payments** (record + list, invoice `INV-YYYY-#####`), **attendance** (check-in w/ valid-membership banner, daily summary), **dashboard** (active/total members, expiring-soon, today check-ins, revenue MTD). Verified full loop: plan→member→membership→payment→check-in→dashboard.
- ✅ **Web admin app (`apps/web`) live & building.** Next.js 15 (App Router) + Tailwind + TanStack Query; access token in memory + refresh token in localStorage (httpOnly-cookie migration is a cloud-hardening TODO, §15); role-gated nav from `me.permissions`. Screens: **login**, **dashboard** (KPI cards), **members** (search, add, "sell plan + charge"), **plans** (add/list), **payments** (record + list), **check-in** (reception, green/red validity banner + today's log). `next build` clean; verified both servers run and `/login` serves while the API reports `database:"up"`. One-click launch: `scripts\Start GymFlow App.bat` → http://localhost:3000.
- 🚧 Not built yet: mobile/desktop apps, `packages/ui` + `api-client`; reports/expenses/notifications; member-login/invite flow; tests.

### Local environment notes (Windows + Laragon)
- Node 22 + npm present. **pnpm 11.6** installed globally; the npm global bin `C:\Users\Jawad\AppData\Roaming\npm` was added to the User PATH. Tool-spawned shells may still need `$env:PATH = "$env:APPDATA\npm;$env:PATH"` prepended (they inherit a cached env).
- pnpm 11 blocks dependency build scripts by default → trusted ones (Prisma engines) are approved in `pnpm-workspace.yaml` under `allowBuilds`.
- **Redis** runs locally (Laragon binary) and is **required by the backend** (login sessions). Start it with `scripts\redis-start.ps1`, or start DB + Redis together via `scripts\services-start.ps1` (or the `Start GymFlow Services.bat` double-click).
- **PostgreSQL 16.6 installed locally** (portable, no service): binaries `C:\laragon\bin\postgresql\pgsql`, data `C:\laragon\data\gymflow-pg`, superuser `postgres`/`postgres`, db `gymflow_dev` on :5432. It runs as a plain process and does **not** auto-start after reboot — **start it before backend work** with `scripts\pg-start.ps1` (or the `Start GymFlow Database.bat` double-click); stop with `scripts\pg-stop.ps1`. (Postgres binaries live outside the repo and are not committed.)
- Run the API: `pnpm --filter @gymflow/backend dev`. Env lives in `backend/.env` (gitignored; template at `backend/.env.example`).
- **Schema-location deviation:** the Prisma schema lives in `backend/prisma/` (Prisma's convention), not the top-level `database/` sketched in §6. See `database/README.md`.

## Immediate next steps for a new session
*(One-click local run: `scripts\Start GymFlow App.bat` → http://localhost:3000, login `owner@demo.gym`/`Password123!`.)*
1. **Expand the web app**: member profile page (history/payments/attendance), membership renew/freeze UI, settings (gym profile, staff/roles), reports. Extract shared UI into `packages/ui`; generate `packages/api-client` from the OpenAPI at `/api/docs`.
2. **Member login/invite flow** (members have no credentials yet): endpoint to set email+password / send invite + assign the `member` role; then the **mobile app** (Expo) for members/trainers.
3. **Cloud hardening (for the online move):** switch web auth to **httpOnly cookies** (drop localStorage), point `DATABASE_URL`/`REDIS_URL` at managed services (Neon/Upstash or Railway), secrets management, tests (auth + payments), CI, deploy (§12 Phase 6–7).

## Conventions
- **Git author** for verified commits: `git config user.email noreply@anthropic.com && git config user.name Claude`.
- **Branches:** develop on feature branches (`claude/<name>` or `feat/<name>`); don't push to `main` without permission.
- **Code style & naming:** PRODUCT_PLAN.md §7 (snake_case DB, camelCase API JSON, PascalCase types, Conventional Commits).
- **Do not** add Laravel/PHP/Python or any non-TypeScript backend.

## Key references
- `docs/PRODUCT_PLAN.md` — full product & technical plan (features, schema, RBAC, MVP, roadmap, API, security, pricing, launch).
- `README.md` — short repo overview.
