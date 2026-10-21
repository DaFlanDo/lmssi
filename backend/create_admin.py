"""
Run once to create the initial admin user:
  python create_admin.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
import app.models  # noqa: F401 — register all models with Base

from app.db_migrate import run_migrations
run_migrations()

from app.models.user import User
from app.models.group import Group
from app.services.auth import hash_password

db = SessionLocal()

ADMIN_EMAIL = "admin@barhleb.by"
ADMIN_PASSWORD = "admin123"
ADMIN_NAME = "Администратор системы"
ADMIN_ID_NUMBER = "0101903A001PB1"

existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
if existing:
    print(f"Admin already exists: {ADMIN_EMAIL}")
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

# Seed initial groups
GROUPS = [
    {"name": "Производственный цех", "specialties": ["Токарь", "Фрезеровщик", "Шлифовщик", "Сварщик"]},
    {"name": "Склад", "specialties": ["Кладовщик", "Грузчик", "Комплектовщик"]},
    {"name": "ИТ и администрация", "specialties": ["Инженер ИТ", "Бухгалтер", "Менеджер по кадрам"]},
]

for dept_data in GROUPS:
    dept = db.query(Group).filter(Group.name == dept_data["name"], Group.parent_id == None).first()
    if not dept:
        dept = Group(name=dept_data["name"])
        db.add(dept)
        db.commit()
        db.refresh(dept)
        print(f"  ✓ Отдел: {dept.name}")

    for spec_name in dept_data["specialties"]:
        exists = db.query(Group).filter(Group.name == spec_name, Group.parent_id == dept.id).first()
        if not exists:
            spec = Group(name=spec_name, parent_id=dept.id)
            db.add(spec)
            print(f"    ✓ Специальность: {spec_name}")

db.commit()
db.close()
print("\nDone.")
