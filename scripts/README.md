# scripts/

Local development helpers.

## Local services (Windows dev): PostgreSQL + Redis

The backend needs **PostgreSQL** (data) and **Redis** (login sessions). On this
machine both run as plain processes (no Windows service — that needs admin), so
they do **not** start automatically after a reboot. Start them before working.

| Action | Double-click | or run |
|--------|--------------|--------|
| **Start both** | `Start GymFlow Services.bat` | `pwsh scripts/services-start.ps1` |
| **Stop both** | `Stop GymFlow Services.bat` | `pwsh scripts/services-stop.ps1` |

Individual scripts also exist: `pg-start.ps1` / `pg-stop.ps1`,
`redis-start.ps1` / `redis-stop.ps1`.

Defaults (override with env vars if your install differs):

- Postgres binaries: `C:\laragon\bin\postgresql\pgsql\bin` (`GYMFLOW_PG_BIN`)
- Postgres data dir: `C:\laragon\data\gymflow-pg` (`GYMFLOW_PG_DATA`)
- Redis dir: `C:\laragon\bin\redis\redis-x64-5.0.14.1` (`GYMFLOW_REDIS_DIR`)
- Postgres: `postgresql://postgres:postgres@localhost:5432/gymflow_dev`
- Redis: `redis://127.0.0.1:6379`

## Run the whole app (one click)

**`Start GymFlow App.bat`** starts everything (Postgres + Redis + API + web app),
then leave the window open and visit **http://localhost:3000** (sign in with
`owner@demo.gym` / `Password123!`). It runs `services-start.ps1` then `pnpm dev`.

To stop: press `Ctrl+C` in that window, then run `Stop GymFlow Services.bat`.

### Typical backend dev loop

```powershell
# 1. Start the services (once per session / after reboot)
scripts\services-start.ps1
# 2. Run the API in watch mode
pnpm --filter @gymflow/backend dev
# 3. After schema changes
pnpm db:migrate      # create + apply a migration
pnpm db:seed         # reseed roles / demo data (idempotent)
```

Demo owner login (seeded): `owner@demo.gym` / `Password123!`

> These scripts target the local Windows setup. In the cloud / on other machines,
> point `DATABASE_URL` and `REDIS_URL` at managed instances — nothing else changes.
