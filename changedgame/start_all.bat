@echo off
cd /d "%~dp0"
rem Starts the game server and the ngrok tunnel, each in its own window.
start "Pet Game Server" cmd /k call "%~dp0start_game.bat"
timeout /t 6 /nobreak >nul
start "ngrok Tunnel" cmd /k call "%~dp0start_tunnel.bat"
