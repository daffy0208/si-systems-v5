@echo off
setlocal enabledelayedexpansion

:: =============================
:: BuildSafe Generator v1.2.0
:: Identity-Safe Batch Processor
:: =============================

:: ===[ USER VALIDATION LAYER ]===
set expected_user=David
if /i "%USERNAME%" NEQ "%expected_user%" (
    echo.
    echo ❌ ERROR: This script is locked to user '%expected_user%'. Current user: '%USERNAME%'
    echo Exiting to prevent identity drift.
    pause
    exit /b
)

:: ===[ CONFIGURATION ]===
set input_dir=Input_Chunks
set output_dir="C:\Users\David\Documents\Sapien Intelligence\BrainFrameOS_v3.2.1_Master"

:: ===[ PATH CHECKS ]===
echo.
echo 🛠️  Running BuildSafe Generator v1.2.0...
if not exist %input_dir% (
    echo ❌ Input directory not found: %input_dir%
    pause
    exit /b
)

if not exist %output_dir% (
    echo ❌ Output directory not found: %output_dir%
    pause
    exit /b
)

:: ===[ CREATE STRUCTURE ]===
if not exist %output_dir%\Core mkdir "%output_dir%\Core"
if not exist %output_dir%\Core\Philosophy mkdir "%output_dir%\Core\Philosophy"

:: ===[ START PROCESSING ]===
set /a count_written=0
echo.

for %%F in ("%input_dir%\*.txt") do (
    echo 🔍 Processing: %%~nxF
    set "filepath="
    for /f "usebackq delims=" %%L in ("%%F") do (
        set "line=%%L"
        echo !line! | findstr /b /c:"[File:" >nul
        if !errorlevel! == 0 (
            for /f "tokens=2 delims=[]" %%A in ("!line!") do (
                set "filename=%%A"
                set "filepath=%output_dir%\Core\Philosophy\!filename!.txt"
                if exist "!filepath!" (
                    copy /y "!filepath!" "!filepath!.bak" >nul
                    echo 🔁 Existing file backed up: !filename!.bak
                )
                (echo. > "!filepath!") & echo 📝 Initialized: !filename!.txt
                set /a count_written+=1
            )
        ) else (
            if defined filepath (
                echo !line!>>"!filepath!"
            ) else (
                echo ⚠️  Orphan line ignored (no [File: header]): !line!>>"%output_dir%\error_log.txt"
            )
        )
    )
)

:: ===[ SUMMARY ]===
echo.
echo ✅ All chunks processed.
echo 🧾 Files written: !count_written!
echo 🗂️  Output path: %output_dir%\Core\Philosophy
echo 🔐 User: %USERNAME%
echo.

endlocal
pause

