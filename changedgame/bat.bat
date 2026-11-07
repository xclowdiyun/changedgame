@echo off
cd /d D:\apiandyiyou\discord_petgame\changedgame
start "backend" cmd /k ".venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
start "frontend" cmd /k ".venv\Scripts\python.exe run_game.py --port 5173"
timeout /t 3 >nul
start http://127.0.0.1:5173
start http://127.0.0.1:5173