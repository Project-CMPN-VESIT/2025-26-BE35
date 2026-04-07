@echo off
cd /d "%~dp0"
echo Running CryptoDataCollector...
"D:\softwares\DevTools\Anaconda\envs\crypto\python.exe" "continuous_data_collector.py"
pause
