@echo off
setlocal enabledelayedexpansion

echo Running BuildSafe Generator v1.1.2...
set input_dir=Input_Chunks
set output_dir=BrainFrameOS_v3.2.1_Master

:: Ensure output directories exist (quoted for spaces)
if not exist "%output_dir%" mkdir "%output_dir%"
if not exist "%output_dir%\Core" mkdir "%output_dir%\Core"
if not exist "%output_dir%\Core\Philosophy" mkdir "%output_dir%\Core\Philosophy"

:: Process each chunk file
for %%F in ("%input_dir%\*.txt") do (
    echo Processing: %%~nxF
    set "current_file="

    for /f "usebackq delims=" %%L in ("%%F") do (
        set "line=%%L"
        echo !line! | findstr /b "[File:" >nul
        if !errorlevel! == 0 (
            for /f "tokens=2 delims=[]" %%A in ("!line!") do (
                set "filename=%%~A"
                set "filepath=%output_dir%\Core\Philosophy\!filename!"
                >"!filepath!" (
                    rem File header initialized
                )
                echo Writing to: !filepath!
            )
        ) else (
            if defined filepath (
                echo !line!>>"!filepath!"
            )
        )
    )
)

echo.
echo ✅ All files created and populated successfully.
pause
endlocal
