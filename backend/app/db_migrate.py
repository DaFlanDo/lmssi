"""
Приведение схемы БД к актуальной через Alembic.

Вызывается при старте backend и из seed-скриптов. Три случая:
1. Пустая база — `upgrade head` создаёт все таблицы.
2. База под Alembic — `upgrade head` докатывает новые миграции.
3. Старая база, созданная до Alembic (через create_all + ALTER TABLE на старте) —
   догоняем её прежними ALTER-ами, переносим данные из должностей в группы
   и помечаем как актуальную (`stamp head`), не трогая данные.
"""
from __future__ import annotations

import logging
import os

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect, text

from app.database import engine

log = logging.getLogger("db_migrate")

_MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")

# Колонки, которые раньше добавлялись ALTER-ами при каждом старте
_LEGACY_ALTERS = [
    "ALTER TABLE enrollments ADD COLUMN due_date DATETIME",
    "ALTER TABLE users ADD COLUMN position_id INTEGER",
    "ALTER TABLE module_test_attempts ADD COLUMN focus_violations INTEGER DEFAULT 0",
    "ALTER TABLE courses ADD COLUMN sequential BOOLEAN DEFAULT false",
    "ALTER TABLE courses ADD COLUMN require_video BOOLEAN DEFAULT false",
]

# Перенос устаревших Position в иерархию Group по совпадению имён.
# Таблицы positions/position_course остаются в старой БД «спящими».
_LEGACY_DATA_MIGRATIONS = [
    'INSERT INTO group_course (group_id, course_id, "order") '
    'SELECT g.id, pc.course_id, pc."order" FROM position_course pc '
    'JOIN positions p ON p.id = pc.position_id '
    'JOIN groups g ON g.name = p.name '
    'WHERE NOT EXISTS (SELECT 1 FROM group_course gc '
    '  WHERE gc.group_id = g.id AND gc.course_id = pc.course_id)',
    'UPDATE users SET group_id = ('
    '  SELECT g.id FROM groups g JOIN positions p ON g.name = p.name '
    '  WHERE p.id = users.position_id LIMIT 1) '
    'WHERE group_id IS NULL AND position_id IS NOT NULL',
]


def _alembic_config(connection) -> Config:
    cfg = Config()
    cfg.set_main_option("script_location", _MIGRATIONS_DIR)
    cfg.attributes["connection"] = connection
    return cfg


def _upgrade_legacy_db() -> None:
    # Раньше create_all на каждом старте досоздавал недостающие таблицы —
    # повторяем это один раз (существующие таблицы он не трогает)
    import app.models  # noqa: F401
    from app.database import Base
    Base.metadata.create_all(bind=engine)

    insp = inspect(engine)
    for sql in _LEGACY_ALTERS:
        table, column = sql.split()[2], sql.split()[5]
        if column not in {c["name"] for c in insp.get_columns(table)}:
            with engine.begin() as conn:
                conn.execute(text(sql))

    tables = set(inspect(engine).get_table_names())
    if {"positions", "position_course"} <= tables:
        for sql in _LEGACY_DATA_MIGRATIONS:
            with engine.begin() as conn:
                conn.execute(text(sql))


def run_migrations() -> None:
    tables = set(inspect(engine).get_table_names())
    is_legacy = "users" in tables and "alembic_version" not in tables

    if is_legacy:
        log.info("База создана до Alembic — догоняем схему и ставим отметку head")
        _upgrade_legacy_db()

    with engine.begin() as conn:
        cfg = _alembic_config(conn)
        if is_legacy:
            command.stamp(cfg, "head")
        else:
            command.upgrade(cfg, "head")
