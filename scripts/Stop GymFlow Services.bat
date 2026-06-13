@echo off
REM Double-click to stop the local GymFlow services (PostgreSQL + Redis).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0services-stop.ps1"
echo.
pause
