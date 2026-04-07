@echo off
cd /d "%~dp0"

echo ======================================================
echo MULTI-TASK CRYPTO - TASK INSTALLER
echo ======================================================
echo.
echo Running from: %CD%
echo.
pause

echo Installing tasks...
echo.

schtasks /create /tn "CryptoDataCollector" /xml "CryptoDataCollector.xml" /f
schtasks /create /tn "CryptoDataMerger" /xml "CryptoDataMerger.xml" /f
schtasks /create /tn "CryptoModelUpdate" /xml "CryptoModelUpdate.xml" /f
schtasks /create /tn "CryptoPerformanceCheck" /xml "CryptoPerformanceCheck.xml" /f
schtasks /create /tn "CryptoFullRetrain" /xml "CryptoFullRetrain.xml" /f

echo.
echo DONE! Verify:
schtasks /query | findstr Crypto

pause