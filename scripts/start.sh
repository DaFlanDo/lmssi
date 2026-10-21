#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
#  LMSSI — запуск backend + frontend (macOS / Linux)
#  Backend:  http://localhost:8000   (API + Swagger на /docs)
#  Frontend: http://localhost:5173
#  Остановить оба сервера: Ctrl+C
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

[ -d "$BACKEND/venv" ] || { echo "Сначала выполните ./scripts/setup.sh"; exit 1; }
[ -d "$FRONTEND/node_modules" ] || { echo "Сначала выполните ./scripts/setup.sh"; exit 1; }

# Останавливаем оба процесса при выходе
pids=()
cleanup() { echo -e "\nОстановка…"; for p in "${pids[@]}"; do kill "$p" 2>/dev/null || true; done; }
trap cleanup INT TERM EXIT

echo "▶ Backend  → http://localhost:8000  (docs: /docs)"
( cd "$BACKEND" && source venv/bin/activate && python run.py ) &
pids+=($!)

echo "▶ Frontend → http://localhost:5173"
( cd "$FRONTEND" && npm run dev ) &
pids+=($!)

wait
