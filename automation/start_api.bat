@echo off
title IntelliDex ML API Server
echo ============================================================
echo   IntelliDex ML API Server
echo   Starting on http://localhost:5001
echo   Press Ctrl+C to stop
echo ============================================================
echo.

cd /d "%~dp0"

:: Check if flask is installed
python -c "import flask" 2>nul
if errorlevel 1 (
    echo Flask not found. Installing dependencies...
    pip install flask flask-cors
    echo.
)

python api_server.py
pause
