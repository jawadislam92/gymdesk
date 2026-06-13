# Stops the local Redis server for GymFlow.
$RedisDir = $env:GYMFLOW_REDIS_DIR; if (-not $RedisDir) { $RedisDir = 'C:\laragon\bin\redis\redis-x64-5.0.14.1' }
try { & "$RedisDir\redis-cli.exe" -p 6379 shutdown nosave } catch { }
Write-Host 'Redis stopped.' -ForegroundColor Yellow
