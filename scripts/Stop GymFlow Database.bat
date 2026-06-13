@echo off
REM Double-click to stop the local GymFlow PostgreSQL database.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pg-stop.ps1"
echo.
pause
