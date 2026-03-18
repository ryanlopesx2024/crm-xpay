#!/bin/bash
set -e

echo "=== CRM XPAY - Deploy ==="

# Verifica se .env existe
if [ ! -f .env ]; then
  echo "ERRO: arquivo .env não encontrado!"
  echo "Copie .env.example para .env e preencha os valores."
  exit 1
fi

# Sobe tudo
docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Deploy concluído! ==="
source .env
echo "Frontend: ${FRONTEND_URL:-http://localhost}"
echo "Backend:  ${BACKEND_URL:-http://localhost:3001}"
