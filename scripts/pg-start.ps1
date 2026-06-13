# Starts the local PostgreSQL server for GymFlow (Windows dev — runs as a plain
# process, no admin/service needed). Paths can be overridden with the
# GYMFLOW_PG_BIN / GYMFLOW_PG_DATA environment variables.
$ErrorActionPreference = 'Stop'
$PgBin = $env:GYMFLOW_PG_BIN; if (-not $PgBin) { $PgBin = 'C:\laragon\bin\postgresql\pgsql\bin' }
$PgData = $env:GYMFLOW_PG_DATA; if (-not $PgData) { $PgData = 'C:\laragon\data\gymflow-pg' }

if (Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host 'PostgreSQL is already running on port 5432.' -ForegroundColor Green
  return
}
& "$PgBin\pg_ctl.exe" -D $PgData -l "$PgData\server.log" -o "-p 5432" -w start
& "$PgBin\pg_isready.exe" -h 127.0.0.1 -p 5432
Write-Host 'PostgreSQL (gymflow_dev) is up on localhost:5432.' -ForegroundColor Green
