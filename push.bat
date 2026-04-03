@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

echo.
echo === Repo ===
echo %CD%
echo.

git status -sb
if errorlevel 1 (
  echo ERROR: git failed. Is this a git repo?
  pause
  exit /b 1
)

echo.
if not "%~1"=="" (
  set "COMMIT_MSG=%*"
) else (
  set "COMMIT_MSG="
  set /p "COMMIT_MSG=Commit message (Enter to skip commit and only push): "
)

if not "!COMMIT_MSG!"=="" (
  git add -A
  if errorlevel 1 goto :fail
  git commit -m "!COMMIT_MSG!"
  if errorlevel 1 (
    echo Commit failed or nothing to commit. Trying push anyway...
  )
)

for /f "tokens=*" %%B in ('git branch --show-current 2^>nul') do set "BRANCH=%%B"
if not defined BRANCH (
  echo ERROR: Could not read current branch.
  goto :fail
)

echo.
echo === Pushing origin !BRANCH! ===
git push origin "!BRANCH!"
if errorlevel 1 goto :fail

echo.
echo Done.
pause
exit /b 0

:fail
echo.
echo A git step failed (see above).
pause
exit /b 1
