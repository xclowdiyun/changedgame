@echo off
setlocal
cd /d "%~dp0"
title Cloudflare Tunnel (keep this window open)

where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared is not installed. Installing it with winget...
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  echo.
  echo Done. CLOSE this window, then double-click start_tunnel.bat again.
  pause
  exit /b 0
)

echo ============================================================
echo   Make sure start_game.bat is already running.
echo   Below, look for a line like:
echo        https://something-random.trycloudflare.com
echo   Copy ONLY the domain (without https://) into Discord:
echo   Developer Portal - Activities - URL Mappings
echo      Prefix: /      Target: something-random.trycloudflare.com
echo   The domain changes every time you restart this window.
echo ============================================================
echo.
cloudflared tunnel --url http://127.0.0.1:8000
pause
