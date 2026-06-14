@echo off
REM One-click local launch: starts PostgreSQL + Redis, then the API and web app.
REM Leave this window open while you use the app. Press Ctrl+C to stop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0services-start.ps1"
cd /d "%~dp0.."
echo.
echo ============================================================
echo  Starting GymFlow  (API: http://localhost:4000)
echo                    (Web: http://localhost:3000)
echo  Wait until you see "Ready", then open:
echo      http://localhost:3000
echo  Sign in with:  owner@demo.gym  /  Password123!
echo ============================================================
echo.
call pnpm dev
