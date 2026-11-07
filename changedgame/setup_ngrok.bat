@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title ngrok setup

set "NG="
where ngrok >nul 2>nul && set "NG=ngrok"
if not defined NG if exist "%~dp0ngrok.exe" set "NG=%~dp0ngrok.exe"
if not defined NG (
  echo ngrok was not found. Run start_tunnel.bat first to install it, or put ngrok.exe in this folder.
  pause
  exit /b 1
)
echo Found ngrok:
where ngrok 2>nul
echo.
echo --- Current ngrok config ---
"!NG!" config check
echo.
echo ------------------------------------------------------------
echo  STEP 1  authtoken  (https://dashboard.ngrok.com/get-started/your-authtoken)
echo  If you configured ngrok before on this computer you can skip: just press Enter.
echo ------------------------------------------------------------
set "TOKEN="
set /p TOKEN=Paste authtoken (Enter = skip): 
if defined TOKEN "!NG!" config add-authtoken !TOKEN!

echo.
echo ------------------------------------------------------------
echo  STEP 2  fixed domain  (https://dashboard.ngrok.com/domains)
echo  Every free account gets one, like  xxxx-xxxx.ngrok-free.app
echo  With it you set Discord URL Mappings ONCE and never change it again.
echo ------------------------------------------------------------
set "DOM="
set /p DOM=Paste your domain (Enter = skip): 
if defined DOM (
  set "DOM=!DOM:https://=!"
  set "DOM=!DOM:/=!"
  set "DOM=!DOM: =!"
  if not exist backend mkdir backend
  if exist "backend\.env" (
    findstr /v /b /i "NGROK_DOMAIN=" "backend\.env" > "backend\.env.tmp"
    move /y "backend\.env.tmp" "backend\.env" >nul
  )
  >> "backend\.env" echo.
  >> "backend\.env" echo NGROK_DOMAIN=!DOM!
  echo Saved NGROK_DOMAIN=!DOM! to backend\.env
)
echo.
echo All set. From now on just double-click start_all.bat
pause
