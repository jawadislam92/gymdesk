# Stops both local services (PostgreSQL + Redis).
& "$PSScriptRoot\redis-stop.ps1"
& "$PSScriptRoot\pg-stop.ps1"
