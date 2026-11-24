@echo off
rem Starts the website in DEVELOPMENT mode, reachable from THIS computer only. Close this window to stop it.
cd /d "%~dp0"
if not exist node_modules ( call npm install )
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /f /pid %%p >nul 2>&1
timeout /t 2 /nobreak >nul
if exist .next rmdir /s /q .next
start "" cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
call npm run dev
pause
