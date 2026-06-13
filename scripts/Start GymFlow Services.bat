@echo off
REM Double-click to start the local GymFlow services (PostgreSQL + Redis).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0services-start.ps1"
echo.
pause
