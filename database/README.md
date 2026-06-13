# database/

The data model is defined in **`backend/prisma/schema.prisma`** (Prisma's
conventional location, so its tooling and the generated client work with zero
extra config). PRODUCT_PLAN.md §6 sketched a top-level `database/` folder; in
practice the schema lives next to the backend that owns it.

- **Schema (source of truth):** [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- **Migrations:** `backend/prisma/migrations/` (created by `pnpm db:migrate`)
- **Seed:** [`backend/prisma/seed.ts`](../backend/prisma/seed.ts) — run via `pnpm db:seed`

Common commands (from the repo root):

```bash
pnpm db:generate   # regenerate the Prisma client after schema changes
pnpm db:migrate    # create + apply a dev migration
pnpm db:seed       # seed roles + a demo gym/owner/plans
pnpm db:studio     # open Prisma Studio (visual DB browser)
```
