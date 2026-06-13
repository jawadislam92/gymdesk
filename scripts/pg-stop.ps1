# Stops the local PostgreSQL server for GymFlow.
$ErrorActionPreference = 'Stop'
$PgBin = $env:GYMFLOW_PG_BIN; if (-not $PgBin) { $PgBin = 'C:\laragon\bin\postgresql\pgsql\bin' }
$PgData = $env:GYMFLOW_PG_DATA; if (-not $PgData) { $PgData = 'C:\laragon\data\gymflow-pg' }
& "$PgBin\pg_ctl.exe" -D $PgData -m fast stop
Write-Host 'PostgreSQL stopped.' -ForegroundColor Yellow
