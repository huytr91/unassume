@echo off
title Unassume
cd /d "%~dp0web"

where npm >nul 2>&1
if errorlevel 1 (
  echo Chua cai Node.js / npm. Cai Node 20+ roi thu lai.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Dang npm install...
  call npm install
  if errorlevel 1 (
    echo npm install that bai.
    pause
    exit /b 1
  )
)

echo Dang khoi dong Unassume tren http://127.0.0.1:3500 ...
echo Mo trinh duyet sau khi server san sang.
start "Unassume-open-browser" cmd /c "timeout /t 3 /nobreak >nul & start http://127.0.0.1:3500"
call npm run dev
pause
