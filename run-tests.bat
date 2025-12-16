@echo off
echo ===============================
echo   ENERLECTRA TEST SUITE
echo ===============================
echo.
echo 1. Quick Test
echo 2. Full Stress Test
echo 3. Load Test
echo 4. Fix API
echo 5. Check Health
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" powershell -ExecutionPolicy Bypass -File "quick-test.ps1"
if "%choice%"=="2" powershell -ExecutionPolicy Bypass -File "stress-test.ps1"
if "%choice%"=="3" powershell -ExecutionPolicy Bypass -File "load-test.ps1"
if "%choice%"=="4" powershell -ExecutionPolicy Bypass -File "fix-api.ps1"
if "%choice%"=="5" powershell -ExecutionPolicy Bypass -File "enerlectra-tests.ps1" health

pause