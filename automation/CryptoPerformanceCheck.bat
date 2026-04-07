@echo off
cd /d "%~dp0"
echo Running CryptoPerformanceCheck...
"D:\softwares\DevTools\Anaconda\envs\crypto\python.exe" "performance_tracker_multitask.py"
pause
