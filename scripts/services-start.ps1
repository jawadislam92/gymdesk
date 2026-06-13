# Starts both local services GymFlow needs for development: PostgreSQL + Redis.
& "$PSScriptRoot\pg-start.ps1"
& "$PSScriptRoot\redis-start.ps1"
Write-Host ''
Write-Host 'GymFlow services ready. Now run:  pnpm --filter @gymflow/backend dev' -ForegroundColor Cyan
