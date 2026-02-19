@echo off
echo ===========================================
echo   INOVAR - SETUP AUTOSTART
echo ===========================================
echo.

set "SCRIPT_PATH=%~dp0start_inovar.py"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\InovarSystem.lnk"

echo Target Script: %SCRIPT_PATH%
echo Startup Folder: %STARTUP_FOLDER%
echo.

if exist "%SHORTCUT_PATH%" (
    echo [INFO] Shortcut already exists. Removing old one...
    del "%SHORTCUT_PATH%"
)

echo [INFO] Creating new shortcut...
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='python';$s.Arguments='\"%SCRIPT_PATH%\"';$s.WorkingDirectory='%~dp0';$s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [SUCCESS] Autostart configured successfully!
    echo The system will now start automatically when Windows logs in.
) else (
    echo [ERROR] Failed to create shortcut.
)

pause
