@echo off
setlocal
cd /d "%~dp0"
echo.
echo ==========================================
echo  Portal de Solicitacoes Internas - Setup
echo  Gabriel Mota Silva - 2026
echo ==========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale Node.js 22.13 ou superior em https://nodejs.org/
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||(v[0]===22&&v[1]>=13)?0:1)"
if errorlevel 1 (
  echo [ERRO] E necessario Node.js 22.13 ou superior. Versao encontrada:
  node -v
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Reinstale Node.js incluindo npm.
  exit /b 1
)
echo [OK] Node.js:
node -v
echo [OK] npm:
npm -v
if not exist .env (
  copy .env.example .env >nul
  if errorlevel 1 (echo [ERRO] Nao foi possivel criar .env.& exit /b 1)
  echo [OK] Arquivo .env criado a partir de .env.example
) else (
  echo [INFO] Arquivo .env existente preservado.
)
if not exist data mkdir data
echo.
echo [1/3] Instalando dependencias...
call npm install
if errorlevel 1 (echo [ERRO] npm install falhou.& exit /b 1)
echo.
echo [2/3] Executando migrations e dados iniciais...
call npm run migrate
if errorlevel 1 (echo [ERRO] Migracao falhou.& exit /b 1)
echo.
echo [3/3] Setup concluido!
echo Backend: npm run start:backend ^(http://localhost:3000^)
echo Frontend: npm run start:frontend ^(http://localhost:5173^)
echo Login demo: admin@portal.local / Admin@123
echo.
exit /b 0
