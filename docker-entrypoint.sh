#!/bin/sh
set -e

# Схема БД + администратор и отделы (идемпотентно)
python create_admin.py

# Демо-пользователи и курсы — только если явно попросили и только один раз:
# seed-скрипты пересоздают курсы, а после прохождения уроков на них
# ссылается прогресс, и повторный запуск уронил бы старт контейнера
DEMO_MARK="${UPLOAD_DIR:-/data/uploads}/.demo_seeded"
if [ "${SEED_DEMO:-0}" = "1" ] && [ ! -f "$DEMO_MARK" ]; then
  python seed_demo.py
  python seed_electrician.py
  touch "$DEMO_MARK"
fi

exec "$@"
