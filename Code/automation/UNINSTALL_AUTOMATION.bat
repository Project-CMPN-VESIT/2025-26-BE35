@echo off
echo Uninstalling crypto automation tasks...
schtasks /delete /tn "CryptoDataCollector" /f
schtasks /delete /tn "CryptoDataMerger" /f
schtasks /delete /tn "CryptoModelUpdate" /f
schtasks /delete /tn "CryptoPerformanceCheck" /f
schtasks /delete /tn "CryptoFullRetrain" /f

echo Done.
pause
