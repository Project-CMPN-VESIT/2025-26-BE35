@echo off
echo ======================================================
echo MULTI-TASK CRYPTO SYSTEM - TASK INSTALLER
echo ======================================================
echo.
echo This will install all automation tasks.
echo Make sure you run this as Administrator.
echo.
echo Current directory: %CD%
echo.
pause

echo.
echo Installing tasks...
echo.

schtasks /create /tn "CryptoDataCollector" /xml "%CD%\CryptoDataCollector.xml" /f
if %errorlevel% equ 0 (
    echo [OK] CryptoDataCollector installed
) else (
    echo [ERROR] Failed to install CryptoDataCollector
)

schtasks /create /tn "CryptoDataMerger" /xml "%CD%\CryptoDataMerger.xml" /f
if %errorlevel% equ 0 (
    echo [OK] CryptoDataMerger installed
) else (
    echo [ERROR] Failed to install CryptoDataMerger
)

schtasks /create /tn "CryptoModelUpdate" /xml "%CD%\CryptoModelUpdate.xml" /f
if %errorlevel% equ 0 (
    echo [OK] CryptoModelUpdate installed
) else (
    echo [ERROR] Failed to install CryptoModelUpdate
)

schtasks /create /tn "CryptoPerformanceCheck" /xml "%CD%\CryptoPerformanceCheck.xml" /f
if %errorlevel% equ 0 (
    echo [OK] CryptoPerformanceCheck installed
) else (
    echo [ERROR] Failed to install CryptoPerformanceCheck
)

schtasks /create /tn "CryptoFullRetrain" /xml "%CD%\CryptoFullRetrain.xml" /f
if %errorlevel% equ 0 (
    echo [OK] CryptoFullRetrain installed
) else (
    echo [ERROR] Failed to install CryptoFullRetrain
)

echo.
echo ======================================================
echo INSTALLATION SUMMARY
echo ======================================================
echo.
echo Verifying installed tasks:
schtasks /query /tn "CryptoDataCollector" >nul 2>&1 && echo [OK] CryptoDataCollector || echo [MISSING] CryptoDataCollector
schtasks /query /tn "CryptoDataMerger" >nul 2>&1 && echo [OK] CryptoDataMerger || echo [MISSING] CryptoDataMerger
schtasks /query /tn "CryptoModelUpdate" >nul 2>&1 && echo [OK] CryptoModelUpdate || echo [MISSING] CryptoModelUpdate
schtasks /query /tn "CryptoPerformanceCheck" >nul 2>&1 && echo [OK] CryptoPerformanceCheck || echo [MISSING] CryptoPerformanceCheck
schtasks /query /tn "CryptoFullRetrain" >nul 2>&1 && echo [OK] CryptoFullRetrain || echo [MISSING] CryptoFullRetrain

echo.
echo ======================================================
echo NEXT STEPS
echo ======================================================
echo.
echo To start data collection now:
echo   schtasks /run /tn "CryptoDataCollector"
echo.
echo To view all tasks:
echo   Open Task Scheduler (taskschd.msc)
echo.
pause