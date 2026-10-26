"""
Возвращает демо-стенд к исходным данным: удаляет все таблицы и загруженные
файлы, затем заново создаёт схему и сид-данные.

На сервере запускается по cron раз в сутки:
  docker compose -p lmssi exec -T app python reset_demo.py
Без DEMO_MODE=1 отказывается работать — чтобы случайно не стереть живую базу.
"""
import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import MetaData, text

from app.config import get_settings
from app.database import engine

HERE = os.path.dirname(os.path.abspath(__file__))
SEED_SCRIPTS = ["create_admin.py", "seed_demo.py", "seed_electrician.py"]

settings = get_settings()
if not settings.demo_mode:
    sys.exit("reset_demo.py работает только при DEMO_MODE=1")

# 1. Схема целиком, вместе с alembic_version — миграции прогонятся заново
if engine.dialect.name == "postgresql":
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
else:
    meta = MetaData()
    meta.reflect(bind=engine)
    meta.drop_all(bind=engine)
engine.dispose()
print("✓ База очищена")

# 2. Загрузки посетителей. Картинки сида seed_electrician.py запишет заново
upload_dir = settings.upload_dir
if os.path.isdir(upload_dir):
    for name in os.listdir(upload_dir):
        path = os.path.join(upload_dir, name)
        if os.path.isdir(path):
            shutil.rmtree(path)
        else:
            os.remove(path)
print("✓ Загрузки очищены")

# 3. Сид-скрипты написаны как сценарии с кодом на верхнем уровне — запускаем как есть
for script in SEED_SCRIPTS:
    subprocess.run([sys.executable, os.path.join(HERE, script)], cwd=HERE, check=True)

os.makedirs(upload_dir, exist_ok=True)
open(os.path.join(upload_dir, ".demo_seeded"), "w").close()
print("✓ Демо-стенд сброшен")
