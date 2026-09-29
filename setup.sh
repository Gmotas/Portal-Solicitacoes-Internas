#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
printf '\n==========================================\n'
printf ' Portal de Solicitações Internas - Setup\n'
printf ' Gabriel Mota Silva - 2026\n'
printf '==========================================\n\n'
if ! command -v node >/dev/null 2>&1; then
  echo "[ERRO] Node.js não encontrado. Instale Node.js 22.13 ou superior: https://nodejs.org/"
  exit 1
fi
NODE_VERSION="$(node -p "process.versions.node")"
NODE_MAJOR="$(printf '%s' "$NODE_VERSION" | cut -d. -f1)"
NODE_MINOR="$(printf '%s' "$NODE_VERSION" | cut -d. -f2)"
if [ "$NODE_MAJOR" -lt 22 ] || { [ "$NODE_MAJOR" -eq 22 ] && [ "$NODE_MINOR" -lt 13 ]; }; then
  echo "[ERRO] Requer Node.js 22.13 ou superior. Encontrado: $NODE_VERSION"
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "[ERRO] npm não encontrado. Reinstale Node.js incluindo npm."
  exit 1
fi
echo "[OK] Node.js: $(node -v)"
echo "[OK] npm: $(npm -v)"
if [ ! -f .env ]; then
  cp .env.example .env
  echo "[OK] Arquivo .env criado a partir de .env.example"
else
  echo "[INFO] Arquivo .env existente preservado."
fi
mkdir -p data
echo
echo "[1/3] Instalando dependências..."
npm install
echo
echo "[2/3] Executando migrations e dados iniciais..."
npm run migrate
echo
echo "[3/3] Setup concluído!"
echo "Backend: npm run start:backend (http://localhost:3000)"
echo "Frontend: npm run start:frontend (http://localhost:5173)"
echo "Login demo: admin@portal.local / Admin@123"
