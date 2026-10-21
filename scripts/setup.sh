#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
#  LMSSI — развёртывание с нуля (macOS / Linux). Запускать из корня проекта.
#
#  Использование:
#    ./scripts/setup.sh                 # SQLite + демо-данные (рекомендуется)
#    ./scripts/setup.sh --postgres      # PostgreSQL (создаёт БД lmssi)
#    ./scripts/setup.sh --no-seed       # без демо-данных (только админ и отделы)
#    ./scripts/setup.sh --run           # после установки сразу запустить серверы
#
#  Что делает: проверяет окружение, ставит зависимости backend и frontend,
#  создаёт .env, инициализирует БД и наполняет её демо-данными.
# ═════════════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── Цвета ────────────────────────────────────────────────────────────────────
if [ -t 1 ]; then
  G="\033[32m"; Y="\033[33m"; R="\033[31m"; B="\033[34m"; D="\033[2m"; N="\033[0m"
else
  G=""; Y=""; R=""; B=""; D=""; N=""
fi
step() { echo -e "\n${B}▶ $*${N}"; }
ok()   { echo -e "${G}✓${N} $*"; }
warn() { echo -e "${Y}!${N} $*"; }
die()  { echo -e "${R}✗ $*${N}" >&2; exit 1; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# ── Флаги ────────────────────────────────────────────────────────────────────
USE_POSTGRES=0; SEED=1; RUN_AFTER=0
for arg in "$@"; do
  case "$arg" in
    --postgres) USE_POSTGRES=1 ;;
    --no-seed)  SEED=0 ;;
    --run)      RUN_AFTER=1 ;;
    -h|--help)  grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Неизвестный флаг: $arg (см. ./setup.sh --help)" ;;
  esac
done

echo -e "${B}╔════════════════════════════════════════════╗${N}"
echo -e "${B}║   LMSSI — установка с нуля                  ║${N}"
echo -e "${B}╚════════════════════════════════════════════╝${N}"

# ── 1. Проверка инструментов ─────────────────────────────────────────────────
step "Проверка окружения"
PYTHON=""
for cand in python3.12 python3.11 python3.10 python3 python; do
  if command -v "$cand" >/dev/null 2>&1; then PYTHON="$cand"; break; fi
done
[ -n "$PYTHON" ] || die "Python 3.9+ не найден. Установите: https://www.python.org/downloads/"
PYVER="$($PYTHON -c 'import sys; print("%d.%d"%sys.version_info[:2])')"
ok "Python $PYVER ($PYTHON)"

command -v node >/dev/null 2>&1 || die "Node.js не найден. Установите 18+: https://nodejs.org/"
command -v npm  >/dev/null 2>&1 || die "npm не найден (идёт в комплекте с Node.js)."
ok "Node $(node -v) / npm $(npm -v)"

if [ "$USE_POSTGRES" -eq 1 ]; then
  command -v psql >/dev/null 2>&1 || die "PostgreSQL (psql) не найден. Установите или запустите без --postgres."
  command -v createdb >/dev/null 2>&1 || die "createdb не найден (часть PostgreSQL)."
  ok "PostgreSQL $(psql --version | awk '{print $3}')"
fi

# ── 2. Backend: виртуальное окружение + зависимости ──────────────────────────
step "Backend: venv и зависимости"
cd "$BACKEND"
if [ ! -d venv ]; then
  "$PYTHON" -m venv venv
  ok "Создано виртуальное окружение backend/venv"
else
  ok "venv уже существует"
fi
# shellcheck disable=SC1091
source venv/bin/activate
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
ok "Python-зависимости установлены"

# ── 3. .env ──────────────────────────────────────────────────────────────────
step "Настройка переменных окружения (.env)"
if [ -f .env ]; then
  warn ".env уже существует — оставляю как есть"
else
  SECRET="$(python -c 'import secrets; print(secrets.token_hex(32))')"
  if [ "$USE_POSTGRES" -eq 1 ]; then
    DBURL="postgresql://$(whoami)@localhost:5432/lmssi"
  else
    DBURL="sqlite:///./lms.db"
  fi
  cat > .env <<EOF
DATABASE_URL=$DBURL
SECRET_KEY=$SECRET
EOF
  ok "Создан .env (DATABASE_URL=$DBURL)"
fi

# ── 3b. ИИ-шлюз: ключ для генерации курсов и наставника ───────────────────────
step "Настройка ИИ-шлюза (генерация курсов + ИИ-наставник)"
AI_BASE_DEFAULT="https://api.wellflow.dev/v1"
AI_MODEL_DEFAULT="claude-sonnet-4.6"
if grep -qE '^OPENAI_API_KEY=.+' .env 2>/dev/null; then
  ok "Ключ ИИ уже задан в .env — оставляю как есть"
else
  AI_KEY="${OPENAI_API_KEY:-}"
  if [ -z "$AI_KEY" ] && [ -t 0 ]; then
    echo -e "${D}ИИ-функции (автогенерация курса из документа, чат-наставник в уроке)${N}"
    echo -e "${D}требуют ключ OpenAI-совместимого шлюза. Enter — пропустить (ИИ выключен).${N}"
    printf "  Введите OPENAI_API_KEY: "
    read -r AI_KEY
  fi
  if [ -n "$AI_KEY" ]; then
    cat >> .env <<EOF

# ИИ-шлюз (OpenAI-совместимый)
OPENAI_API_KEY=$AI_KEY
OPENAI_BASE_URL=${OPENAI_BASE_URL:-$AI_BASE_DEFAULT}
OPENAI_MODEL=${OPENAI_MODEL:-$AI_MODEL_DEFAULT}
EOF
    ok "Ключ ИИ записан в .env (модель ${OPENAI_MODEL:-$AI_MODEL_DEFAULT})"
  else
    warn "Ключ не задан — генерация курсов и ИИ-наставник будут отключены."
    warn "Позже добавьте OPENAI_API_KEY в backend/.env и перезапустите backend."
  fi
fi

# ── 4. PostgreSQL: создать БД при необходимости ──────────────────────────────
if [ "$USE_POSTGRES" -eq 1 ]; then
  step "PostgreSQL: база данных lmssi"
  if psql -lqt | cut -d \| -f 1 | grep -qw lmssi; then
    ok "БД lmssi уже существует"
  else
    createdb lmssi && ok "БД lmssi создана"
  fi
fi

# ── 5. Инициализация БД и демо-данные ────────────────────────────────────────
step "Инициализация базы данных"
python create_admin.py
ok "Таблицы созданы, админ и отделы добавлены"

if [ "$SEED" -eq 1 ]; then
  step "Наполнение демо-данными (это может занять минуту)"
  python seed_demo.py
  python seed_electrician.py
  ok "Демо-курсы, пользователи и материалы загружены"
else
  warn "Сидинг пропущен (--no-seed)"
fi
deactivate

# ── 6. Frontend: зависимости и сборка ────────────────────────────────────────
step "Frontend: npm install"
cd "$FRONTEND"
npm install --no-fund --no-audit
ok "Зависимости frontend установлены"

step "Frontend: production-сборка (проверка, что всё компилируется)"
npm run build
ok "Сборка собрана в frontend/dist"

# ── Готово ───────────────────────────────────────────────────────────────────
echo -e "\n${G}╔════════════════════════════════════════════╗${N}"
echo -e "${G}║   Установка завершена                       ║${N}"
echo -e "${G}╚════════════════════════════════════════════╝${N}"
if [ "$SEED" -eq 1 ]; then
  echo -e "\n${D}Демо-логины (пароль / роль):${N}"
  echo "  admin@barhleb.by    / admin123     — администратор"
  echo "  hr@barhleb.by       / hr123        — HR / методист"
  echo "  sidorov@barhleb.by  / student123   — студент (и др. сотрудники)"
fi
echo -e "\nЗапуск:  ${B}./scripts/start.sh${N}    (backend :8000  +  frontend :5173)"

if [ "$RUN_AFTER" -eq 1 ]; then
  step "Запуск серверов"
  exec "$(dirname "${BASH_SOURCE[0]}")/start.sh"
fi
