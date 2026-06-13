# GymFlow Suite

A multi-platform gym management system for gym owners, managers, trainers, reception staff, and members — running on **Web, Android, iOS, Windows, and Mac** from one shared backend.

> 📄 **Full plan:** see [`docs/PRODUCT_PLAN.md`](docs/PRODUCT_PLAN.md) for the complete product & technical planning document (18 sections: features, tech stack, database schema, RBAC, MVP, roadmap, API, security, pricing, and launch strategy).

## At a glance

| | |
|---|---|
| **Recommended repo name** | `gymflow-suite` |
| **Product name** | GymFlow Suite |
| **Architecture** | Monorepo (pnpm + Turborepo), one backend, many clients |
| **Stack** | Next.js (web) · React Native/Expo (mobile) · Tauri (desktop) · NestJS + Prisma + PostgreSQL + Redis |
| **Platforms** | Web (admin) · Desktop (reception) · Mobile (member + trainer) |

## Platform roles
- **Web** — admin dashboard & management (owners, managers).
- **Desktop (Win/Mac)** — reception desk: check-in, payments, receipt printing.
- **Mobile (iOS/Android)** — member app + trainer app.

## Planned structure

```
gymflow-suite/
  apps/        web/  mobile/  desktop/
  packages/    ui/  shared/  api-client/  config/
  backend/     NestJS API + Prisma
  database/    migrations, seeds, schema
  docs/        PRODUCT_PLAN.md, ADRs
  scripts/     dev / CI / ops
```

See the [planning document](docs/PRODUCT_PLAN.md) for everything else.
