@echo off
rem Builds the website and hosts it (production mode), reachable from THIS computer only.
cd /d "%~dp0"
if not exist node_modules ( call npm install )
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /f /pid %%p >nul 2>&1
timeout /t 2 /nobreak >nul
if exist .next rmdir /s /q .next
call npm run build
if errorlevel 1 ( echo Build failed & pause & exit /b 1 )
echo.
echo  Website:  http://localhost:3000        Admin:  http://localhost:3000/admin
echo  Only this computer can open it. To let phones/others on your Wi-Fi see the public site, use share-on-network.bat
echo.
start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"
call npm run start
pause
