@echo off
setlocal enabledelayedexpansion

echo Running BuildSafe Generator v1.1.3...
set input_dir=Input_Chunks
set output_dir=BrainFrameOS_v3.2.1_Master

:: Ensure output directories exist (quoted for spaces)
if not exist "%output_dir%" mkdir "%output_dir%"
if not exist "%output_dir%\Core" mkdir "%output_dir%\Core"
if not exist "%output_dir%\Core\Philosophy" mkdir "%output_dir%\Core\Philosophy"

:: Process each chunk file
for %%F in ("%input_dir%\*.txt") do (
    echo Processing: %%~nxF
    set "current_file=%%F"

    :: Read lines to determine destination file and content
    set current_output=

    for /f "usebackq delims=" %%L in ("%%F") do (
        set "line=%%L"
        echo !line! | findstr /b /c:"[File:" >nul
        if !errorlevel! == 0 (
            for /f "tokens=1* delims=[]" %%A in ("!line!") do (
                set "filename=%%A"
                set "filepath=%output_dir%\Core\Philosophy\!filename!"
                :: Remove possible unwanted double backslashes
                set "filepath=!filepath:\=\!"

                :: Debugging: Show the final output path
                echo Writing to: !filepath!

                :: File header initialization (for first time writing)
                echo File header initialized

            )
        )
        :: Append the line to the determined file
        if defined filepath (
            echo !line!>>!filepath!
        )
    )
)

echo.
echo All files created and populated successfully.
pause
endlocal
