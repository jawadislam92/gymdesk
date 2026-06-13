# Starts the local Redis server for GymFlow (Windows dev, no service).
$ErrorActionPreference = 'Stop'
$RedisDir = $env:GYMFLOW_REDIS_DIR; if (-not $RedisDir) { $RedisDir = 'C:\laragon\bin\redis\redis-x64-5.0.14.1' }
if (Get-NetTCPConnection -LocalPort 6379 -State Listen -ErrorAction SilentlyContinue) {
  Write-Host 'Redis is already running on port 6379.' -ForegroundColor Green
  return
}
Start-Process -FilePath "$RedisDir\redis-server.exe" -ArgumentList '--port 6379' -WorkingDirectory $RedisDir -WindowStyle Hidden
Start-Sleep -Seconds 1
& "$RedisDir\redis-cli.exe" -p 6379 ping | Out-Null
Write-Host 'Redis is up on localhost:6379.' -ForegroundColor Green
