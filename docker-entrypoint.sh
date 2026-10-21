#!/bin/sh
set -e

# Схема БД + администратор и отделы (идемпотентно)
python create_admin.py

# Демо-пользователи и курсы — только если явно попросили
if [ "${SEED_DEMO:-0}" = "1" ]; then
  python seed_demo.py
  python seed_electrician.py
fi

exec "$@"
