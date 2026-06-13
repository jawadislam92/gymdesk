# scripts/

Local development helpers.

## Local PostgreSQL (Windows dev)

For local development on this machine, PostgreSQL 16.6 runs as a plain process
(not a Windows service — that would need admin rights). It does **not** start
automatically after a reboot, so start it before working on the backend.

| Action | Double-click | or run |
|--------|--------------|--------|
| **Start the database** | `Start GymFlow Database.bat` | `pwsh scripts/pg-start.ps1` |
| **Stop the database** | `Stop GymFlow Database.bat` | `pwsh scripts/pg-stop.ps1` |

Defaults (override with env vars if your install differs):

- Binaries: `C:\laragon\bin\postgresql\pgsql\bin` (`GYMFLOW_PG_BIN`)
- Data dir: `C:\laragon\data\gymflow-pg` (`GYMFLOW_PG_DATA`)
- Connection: `postgresql://postgres:postgres@localhost:5432/gymflow_dev`

### Typical backend dev loop

```powershell
# 1. Start the database (once per session / after reboot)
scripts\pg-start.ps1
# 2. Run the API in watch mode
pnpm --filter @gymflow/backend dev
# 3. After schema changes
pnpm db:migrate      # create + apply a migration
pnpm db:seed         # reseed roles / demo data (idempotent)
```

> These scripts target the local Windows setup. In the cloud / on other machines,
> point `DATABASE_URL` at a managed Postgres instead — nothing else changes.
