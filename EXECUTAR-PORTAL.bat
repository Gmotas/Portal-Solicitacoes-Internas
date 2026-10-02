@echo off
setlocal
cd /d "%~dp0"
title Portal de Solicitacoes Internas
echo ==========================================
echo   PORTAL DE SOLICITACOES INTERNAS
echo   Gabriel Mota Silva - 2026
echo ==========================================
if not exist node_modules (
  echo [INFO] Instalando dependencias...
  call npm install || exit /b 1
)
if not exist .env copy .env.example .env >nul
call npm run migrate || exit /b 1
start "Portal Backend - 3000" cmd /k "cd /d ""%~dp0"" && npm run start:backend"
timeout /t 2 /nobreak >nul
start "Portal Frontend - 5173" cmd /k "cd /d ""%~dp0"" && npm run start:frontend"
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
echo.
echo Portal iniciado em http://localhost:5173
echo Backend: http://localhost:3000
echo Login: admin@portal.local / Admin@123
echo.
