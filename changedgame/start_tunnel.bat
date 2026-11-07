@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title ngrok Tunnel (keep this window open)

set "NG="
where ngrok >nul 2>nul && set "NG=ngrok"
if not defined NG if exist "%~dp0ngrok.exe" set "NG=%~dp0ngrok.exe"
if not defined NG (
  echo ngrok was not found on this computer.
  echo Install it with:   winget install --id Ngrok.Ngrok -e
  echo Then CLOSE this window and run setup_ngrok.bat once.
  echo.
  choice /c YN /m "Install ngrok with winget now"
  if errorlevel 2 exit /b 1
  winget install --id Ngrok.Ngrok -e --accept-source-agreements --accept-package-agreements
  echo.
  echo Done. CLOSE this window, then run setup_ngrok.bat.
  pause
  exit /b 0
)

set "DOMAIN="
if exist "backend\.env" for /f "usebackq tokens=1,* delims==" %%a in (`findstr /b /i "NGROK_DOMAIN=" "backend\.env"`) do set "DOMAIN=%%b"
set "DOMAIN=!DOMAIN:https://=!"
set "DOMAIN=!DOMAIN: =!"

echo ============================================================
echo   Make sure start_game.bat is already running.
if defined DOMAIN (
  echo   Using your fixed domain:  !DOMAIN!
  echo   Put this in Discord URL Mappings  -  Prefix: /   Target: !DOMAIN!
) else (
  echo   Look for the line  "Forwarding  https://xxxx.ngrok-free.app"
  echo   Copy only  xxxx.ngrok-free.app  into Discord URL Mappings.
  echo   ^(It changes every time. Run setup_ngrok.bat to set a fixed domain.^)
)
echo ============================================================
echo.

if defined DOMAIN (
  "!NG!" http --url=https://!DOMAIN! 8000
) else (
  "!NG!" http 8000
)
echo.
echo ngrok stopped. Common reasons:
echo  - ERR_NGROK_4018  : no token yet -^> run setup_ngrok.bat
echo  - ERR_NGROK_108   : ngrok is already running elsewhere ^(free plan = 1 at a time^). Close it.
echo  - "unknown flag --url" : run   ngrok update   then try again
pause
