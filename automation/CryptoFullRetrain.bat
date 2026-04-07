@echo off
cd /d "%~dp0"
echo Running CryptoFullRetrain...
"D:\softwares\DevTools\Anaconda\envs\crypto\python.exe" "train_multi_task.py"
pause
