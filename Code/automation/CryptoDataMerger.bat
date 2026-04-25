@echo off
cd /d "%~dp0"
echo Running CryptoDataMerger...
"D:\softwares\DevTools\Anaconda\envs\crypto\python.exe" "merge_sentiment_and_prices.py"
pause
