@echo off
REM Double-click to start the local GymFlow PostgreSQL database.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pg-start.ps1"
echo.
pause
