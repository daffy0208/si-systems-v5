@echo off
echo Running BuildSafe Generator...
setlocal enabledelayedexpansion

set input_dir=Input_Chunks
set output_dir=BrainFrameOS_v3.2.1_Master

:: Create output directory tree
if not exist %output_dir% mkdir %output_dir%
if not exist %output_dir%\Core mkdir %output_dir%\Core
if not exist %output_dir%\Core\Philosophy mkdir %output_dir%\Core\Philosophy

:: Process each chunk file
for %%f in (%input_dir%\*.txt) do (
    echo Processing: %%~nxf

    :: Read lines to determine destination file and content
    set current_output=

    for /f "usebackq delims=" %%l in ("%%f") do (
        echo %%l | findstr /b /c:"[File:" >nul
        if !errorlevel! == 0 (
            for /f "tokens=2 delims=[]" %%a in ("%%l") do (
                set "file_name=%%~a"
                set "output_path=%output_dir%\Core\Philosophy\!file_name!"
                echo Creating: !output_path!
                (echo. > "!output_path!") 
            )
        ) else (
            if defined output_path (
                echo %%l >> "!output_path!"
            )
        )
    )
)

echo All files generated successfully.
endlocal
pause

