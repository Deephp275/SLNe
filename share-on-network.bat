@echo off
rem Shares the PUBLIC website with other devices on your Wi-Fi/network. READ THIS FIRST:
rem  * Anyone on the same network can open the public pages and send enquiries.
rem  * Admin sign-in is still refused from other devices (it only works on this computer, or over HTTPS).
rem  * Do NOT use this on public/shared Wi-Fi (cafe, hostel, college).
cd /d "%~dp0"
echo.
echo  This will share your website with EVERYONE on this network.
echo  Admin stays locked to this computer. Press Ctrl+C now to cancel.
echo.
pause
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 " ^| findstr LISTENING') do taskkill /f /pid %%p >nul 2>&1
timeout /t 2 /nobreak >nul
if not exist .next ( call npm run build )
set HOST=0.0.0.0
echo  Other devices can open:  http://YOUR-PC-ADDRESS:3000   (run  ipconfig  to find it)
call npm run start
pause
