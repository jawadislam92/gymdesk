# GymFlow Suite — Decisions, Environment Audit & Solved Gotchas

> Read this so you don't re-audit the machine or re-debug problems already solved. Append as
> you go. (ADR-lite: each decision = what + why.)

---

## A. Local environment audit (the dev machine)

| Thing | Value / note |
|---|---|
| OS | Windows 10 Pro, **non-admin** user. Local stack via **Laragon** (`C:\laragon`). |
| Repo | `C:\laragon\www\gymdesk` · remote `github.com/jawadislam92/gymdesk` · branch `feat/scaffold-monorepo`. **Owner pushes himself** — agents do NOT push. |
| Node / npm | Node 22, npm 10 (fine). |
| pnpm | 11.6 (installed globally). **PATH gotcha:** the npm global bin `C:\Users\Jawad\AppData\Roaming\npm` was added to the User PATH, but tool-spawned shells inherit a cached env — **prepend** `\$env:PATH = "\$env:APPDATA\npm;\$env:PATH"` in PowerShell calls or `pnpm` is "not recognized". |
| pnpm build scripts | pnpm 11 blocks dependency scripts; approved ones live in `pnpm-workspace.yaml` → `allowBuilds` (`@prisma/client`, `@prisma/engines`, `prisma`, `esbuild`, `sharp`). The old `package.json#pnpm.onlyBuiltDependencies` is ignored in v11. |
| **PostgreSQL** | **16.6 installed locally** (portable zip — no service, owner isn't admin). Binaries `C:\laragon\bin\postgresql\pgsql\bin`, data `C:\laragon\data\gymflow-pg`, user/pass `postgres`/`postgres`, db `gymflow_dev` on `:5432`. **Does NOT auto-start on reboot.** |
| **Redis** | Laragon bin `C:\laragon\bin\redis\redis-x64-5.0.14.1`. **Required by the backend.** Not a service. |
| Start services | `scripts\services-start.ps1` (PG + Redis) or the one-click `scripts\Start GymFlow App.bat` (services + `pnpm dev`). Stop: `scripts\services-stop.ps1`. |
| Backend run | Dev/watch: `pnpm --filter @gymflow/backend dev`. Prebuilt: `node dist/main.js` (port 4000). **Restart pattern:** kill the process owning port 4000 (`Get-NetTCPConnection -LocalPort 4000`), then start again — do NOT `Stop-Process node` blindly (it also kills the web dev server). |
| Web run | Next 15 dev on `:3000`. Preview via `.claude/launch.json` (session cwd `C:\Users\Jawad\Downloads\Claude`) using `cmd /c pnpm.cmd -C C:\laragon\www\gymdesk --filter @gymflow/web dev`. |
| Browser preview | `mcp__Claude_Preview__*`. **Screenshots time out (CDP quirk on this machine)** — use `preview_snapshot` (accessibility tree) and `preview_eval` to verify instead. Login is prefilled with the demo owner. |
| Demo login | `owner@demo.gym` / `Password123!` (seeded). Test data: member Alice (M0001), Coach Carter (trainer), Rita (receptionist). |

---

## B. Locked technical decisions (do not relitigate)
1. **TypeScript end-to-end.** Backend NestJS(Fastify)+Prisma; web Next.js; mobile Expo; desktop Tauri/Electron. No PHP/Python.
2. **DB = PostgreSQL** (multi-tenant `gym_id` on every table). **ORM = Prisma**; schema lives at `backend/prisma/schema.prisma` (Prisma convention, a deliberate deviation from PRODUCT_PLAN §6's top-level `database/`).
3. **Auth:** argon2id hashing; JWT **access (memory) + refresh (Redis-tracked, rotating)**. RBAC = permission keys on seeded `roles`, embedded in the access token, enforced by global `JwtAuthGuard` + `PermissionsGuard`. ⚠️ **Web stores the refresh token in localStorage today** — migrate to **httpOnly cookies** before public launch (security TODO).
4. **Member identity lives on `User`** (not duplicated on `Member`). `User.email` and `User.passwordHash` are **nullable** so walk-in members exist without a login until invited.
5. **API:** REST under `/api/v1`, validated by zod DTOs (`nestjs-zod` `createZodDto` over `@gymflow/shared` schemas). OpenAPI at `/api/docs`.
6. **Codes/formats:** member code `M0001…` (per-gym sequential); invoice `INV-YYYY-#####`.
7. **Scope:** the full product is 4 surfaces — see [`PRODUCT_EXPANSION_PLAN.md`](PRODUCT_EXPANSION_PLAN.md). Build web-first across all surfaces, then desktop, then mobile.

## C. Per-feature conventions
- **One NestJS module per domain** (members, plans, …); register in `app.module.ts`.
- Controllers: `@ApiTags` + `@ApiBearerAuth`, `@GymId()` for tenant scope, `@RequirePermissions(...)`, `@CurrentUser()` for actor.
- Web: one route folder under `apps/web/app/(app)/`; data via TanStack Query + `apiFetch`; nav items in `(app)/layout.tsx` gated by permission.
- After backend changes: rebuild shared (if schemas changed) → rebuild backend → restart backend. After web changes: Next dev hot-reloads.

## D. Solved gotchas (already fixed — don't rediscover)
- **`nest build` emitted only some files / `Cannot find module './prisma/prisma.module'`** → caused by `incremental: true` + `deleteOutDir`. **Fix:** removed `incremental` from backend tsconfig; `tsconfig.build.json` includes only `src` with `rootDir: src`.
- **Swagger UI crashed Fastify boot** (`@fastify/static missing`) → **Fix:** added `@fastify/static`.
- **`@nestjs/jwt` `expiresIn` type error** (env string vs `ms.StringValue`) → **Fix:** cast sign options `as JwtSignOptions`.
- **Preview server "pnpm.cmd not recognized"** → the runner re-quotes a combined `cd … && …` string. **Fix:** pass each arg separately and use `pnpm -C <dir>` instead of `cd` (see `.claude/launch.json`).
- **`psql` hangs** in non-interactive shells (pager) → use `--no-psqlrc -P pager=off`.
- **Empty-body POSTs** (logout/freeze) → web `apiFetch` only sets `Content-Type: application/json` when there's a body.
- **PrismaService** connects best-effort at boot (won't crash if DB down); `/health` DB ping is time-boxed (1s) so the probe never hangs.

## E. External accounts the owner will need (later, when those features land)
- 🔌 **Stripe** (online + recurring payments, SaaS billing) — and a **local gateway** for the target region.
- 🔌 **Email** (Resend/Postmark) + **SMS** (Twilio/local) + **WhatsApp Business** (high value in many markets).
- 🔌 **FCM** (push). 🔌 **S3/Cloudflare R2** (files). 🔌 Managed **Postgres/Redis** for the online move (Neon/Upstash/Railway).
- These are noted per-feature in `BUILD_TRACKER.md` with the 🔌 marker. The agent will ask for keys only when starting that feature.
