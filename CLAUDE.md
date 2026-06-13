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
  - **Verified:** `pnpm install` clean; backend builds; boots and listens on :4000; `GET /api/v1/health` → 200 (`database:"down"` until Postgres is wired); `GET /api/docs` → 200.
- 🚧 Not built yet: client apps (`apps/web|mobile|desktop`), `packages/ui` + `api-client`, auth/RBAC/feature modules, and a running database.

### Local environment notes (Windows + Laragon)
- Node 22 + npm present. **pnpm 11.6** installed globally; the npm global bin `C:\Users\Jawad\AppData\Roaming\npm` was added to the User PATH. Tool-spawned shells may still need `$env:PATH = "$env:APPDATA\npm;$env:PATH"` prepended (they inherit a cached env).
- pnpm 11 blocks dependency build scripts by default → trusted ones (Prisma engines) are approved in `pnpm-workspace.yaml` under `allowBuilds`.
- **Redis** is available via Laragon (`C:\laragon\bin\redis`). **No PostgreSQL locally** (Laragon ships MySQL) — provision Postgres (managed, e.g. Neon/Railway, or a local install) before `pnpm db:migrate`.
- Run the API: `pnpm --filter @gymflow/backend dev`. Env lives in `backend/.env` (gitignored; template at `backend/.env.example`).
- **Schema-location deviation:** the Prisma schema lives in `backend/prisma/` (Prisma's convention), not the top-level `database/` sketched in §6. See `database/README.md`.

## Immediate next steps for a new session
1. **Provision Postgres**, set `DATABASE_URL` in `backend/.env`, then `pnpm db:migrate` + `pnpm db:seed`. Health then flips to `database:"up"`.
2. **Backend auth + RBAC** (§9, §15): JWT access/refresh, argon2 hashing, `AuthModule`, role/permission guards, per-request gym scoping. Then core modules: gyms, members, plans, memberships, payments, attendance.
3. **Scaffold `apps/web`** (Next.js App Router + Tailwind + TanStack Query) and `packages/ui`; wire login → dashboard. Build order stays **web admin → desktop → mobile** (§12); MVP scope is §10.

## Conventions
- **Git author** for verified commits: `git config user.email noreply@anthropic.com && git config user.name Claude`.
- **Branches:** develop on feature branches (`claude/<name>` or `feat/<name>`); don't push to `main` without permission.
- **Code style & naming:** PRODUCT_PLAN.md §7 (snake_case DB, camelCase API JSON, PascalCase types, Conventional Commits).
- **Do not** add Laravel/PHP/Python or any non-TypeScript backend.

## Key references
- `docs/PRODUCT_PLAN.md` — full product & technical plan (features, schema, RBAC, MVP, roadmap, API, security, pricing, launch).
- `README.md` — short repo overview.
