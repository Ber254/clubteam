@echo off
title ClubTeam - servidor local
cd /d "%~dp0"
echo.
echo  ==========================================
echo   ClubTeam - servidor de desarrollo
echo  ==========================================
echo.
echo   Links una vez que arranque:
echo     Demo UC (crear partido):  http://localhost:3001/demo.html
echo     Demo UJ (anotarse):       http://localhost:3001/demo-jugador.html
echo     Login real:               http://localhost:3001/login
echo.
echo   Deja esta ventana ABIERTA mientras uses la app.
echo   Para frenar el servidor: Ctrl+C o cerra la ventana.
echo.
start "" cmd /c "timeout /t 6 >nul && start http://localhost:3001/demo.html"
call npm run dev -- -p 3001
pause
