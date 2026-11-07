@echo off
setlocal
cd /d "%~dp0"
title Pet Game Server (keep this window open)

if not exist "backend\app\main.py" (
  echo [ERROR] Cannot find backend\app\main.py
  echo Put this file inside the "changedgame" folder, next to index.html, then run it again.
  echo Current folder: %cd%
  pause
  exit /b 1
)

set "PY="
python --version >nul 2>nul && set "PY=python"
if not defined PY py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY (
  echo [ERROR] Python was not found.
  echo Install Python 3.11 or newer from https://www.python.org/downloads/
  echo IMPORTANT: tick "Add python.exe to PATH" in the installer, then run this file again.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment - first run only...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Could not create the virtual environment.
    pause
    exit /b 1
  )
)
set "VPY=%cd%\.venv\Scripts\python.exe"

if not exist ".venv\deps_ok.txt" (
  echo Installing packages - first run only, needs internet...
  if exist "backend\requirements.txt" "%VPY%" -m pip install -r backend\requirements.txt
  "%VPY%" -m pip install fastapi "uvicorn[standard]" python-dotenv
  if errorlevel 1 (
    echo [ERROR] Package install failed. Check your internet connection and run again.
    pause
    exit /b 1
  )
  echo ok> ".venv\deps_ok.txt"
)

if not exist "backend\.env" (
  if exist "backend\.env.example" copy "backend\.env.example" "backend\.env" >nul
)

echo.
echo ============================================================
echo   Game is starting at  http://127.0.0.1:8000
echo   Two browser tabs will open = two players.
echo   Keep this window open. Close it to stop the game.
echo   If you see "address already in use", another copy is
echo   already running - close the other black window first.
echo ============================================================
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:8000 & start http://127.0.0.1:8000"
"%VPY%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

echo.
echo Server stopped.
pause
