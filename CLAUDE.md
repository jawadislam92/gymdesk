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

## Current status (as of 2026-06-13)
- ✅ Planning complete: `docs/PRODUCT_PLAN.md` (v1.1, all 18 sections) + `README.md` + this `CLAUDE.md`.
- ⚠️ These were committed in an earlier **remote session** but **could not be pushed** — that session had **read-only** GitHub access.
- ✅ The owner has since **re-authorized "Claude by Anthropic" with write access**, so a **new session should be able to push**. (Running sessions cache their credentials at start, so the old session stayed read-only.)
- 🚧 **No code scaffolded yet** — only the planning docs exist.

## Immediate next steps for a new session
1. **Verify write access** by pushing the planning docs (`docs/PRODUCT_PLAN.md`, `README.md`, `CLAUDE.md`) to the working branch (or `main`). If push still 403s, the credentials didn't refresh — tell the owner to start another fresh session.
2. **Scaffold the codebase:**
   - Monorepo root: pnpm workspaces + Turborepo, shared `config` (ESLint/TS/Tailwind/Prettier).
   - `backend/`: NestJS (Fastify) + Prisma; implement the schema from **PRODUCT_PLAN.md §8**, auth (JWT + refresh), RBAC guards (§9), multi-tenancy.
   - `packages/`: `shared` (zod schemas + types), `api-client` (generated from OpenAPI), `ui` (design system).
   - `apps/`: `web` (Next.js), `mobile` (Expo), `desktop` (Tauri) shells.
   - `database/`: Prisma schema + seeds (roles, demo gym, plans).
3. **Follow the roadmap (PRODUCT_PLAN.md §12).** Build order: **web admin → desktop reception → mobile**. Start with the MVP scope in **§10**.

## Conventions
- **Git author** for verified commits: `git config user.email noreply@anthropic.com && git config user.name Claude`.
- **Branches:** develop on feature branches (`claude/<name>` or `feat/<name>`); don't push to `main` without permission.
- **Code style & naming:** PRODUCT_PLAN.md §7 (snake_case DB, camelCase API JSON, PascalCase types, Conventional Commits).
- **Do not** add Laravel/PHP/Python or any non-TypeScript backend.

## Key references
- `docs/PRODUCT_PLAN.md` — full product & technical plan (features, schema, RBAC, MVP, roadmap, API, security, pricing, launch).
- `README.md` — short repo overview.
