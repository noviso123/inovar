@echo off
echo ===========================================
echo   INOVAR - AUTOMATED UPDATE & DEPLOYMENT
echo ===========================================
echo.

cd /d "%~dp0"

echo [1/4] Staging all changes...
git add .

echo [2/4] Committing changes...
set /p commit_msg="Enter commit message (default: 'Auto-update'): "
if "%commit_msg%"=="" set commit_msg=Auto-update
git commit -m "%commit_msg%"

echo [3/4] Pushing to repository...
git push

echo [4/4] Restarting Server...
taskkill /F /IM "inovar-server.exe" >nul 2>&1
timeout /t 2 >nul
start "" cmd /c "go run server/cmd/api/main.go"

echo.
echo ===========================================
echo   UPDATE COMPLETE & SERVER RESTARTED
echo ===========================================
pause
