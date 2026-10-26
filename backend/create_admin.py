"""
Схема БД (миграции) и первый администратор. Идемпотентно — запускается при каждом старте.
  python create_admin.py
Отделы, должности и курсы создаёт администратор в интерфейсе или seed_demo.py.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
import app.models  # noqa: F401 — register all models with Base

from app.db_migrate import run_migrations
run_migrations()

from sqlalchemy import or_

from app.models.user import User
from app.services.auth import hash_password

db = SessionLocal()

ADMIN_EMAIL = "admin@nordbyte.dev"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME = "Ирина Белова"
ADMIN_ID_NUMBER = "0101903A001PB1"

# По номеру тоже: в базе, созданной до смены демо-компании, админ с этим номером
# уже есть под другой почтой — второй такой не вставится
existing = db.query(User).filter(
    or_(User.email == ADMIN_EMAIL, User.identification_number == ADMIN_ID_NUMBER)
).first()
if existing:
    print(f"Admin already exists: {existing.email}")
else:
    admin = User(
        email=ADMIN_EMAIL,
        identification_number=ADMIN_ID_NUMBER,
        full_name=ADMIN_NAME,
        hashed_password=hash_password(ADMIN_PASSWORD),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
    print(f"✓ Admin created: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")

db.commit()
db.close()
print("\nDone.")
