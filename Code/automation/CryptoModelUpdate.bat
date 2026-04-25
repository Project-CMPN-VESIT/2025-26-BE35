@echo off
cd /d "%~dp0"
echo Running CryptoModelUpdate...
"D:\softwares\DevTools\Anaconda\envs\crypto\python.exe" "auto_updater_multitask.py"
pause
