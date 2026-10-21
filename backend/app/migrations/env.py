from __future__ import annotations

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import get_settings
from app.database import Base
import app.models  # noqa: F401 — регистрирует все модели в Base.metadata

config = context.config
target_metadata = Base.metadata

# Подключение, переданное из app/db_migrate.py (общий engine приложения),
# иначе — URL из настроек (запуск через CLI `alembic ...`).
url = get_settings().database_url
is_sqlite = url.startswith("sqlite")


def run_migrations_offline() -> None:
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        render_as_batch=is_sqlite,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        _run(connection)
        return

    connectable = engine_from_config(
        {"sqlalchemy.url": url}, prefix="sqlalchemy.", poolclass=pool.NullPool
    )
    with connectable.connect() as conn:
        _run(conn)


def _run(connection) -> None:
    # SQLite не умеет ALTER COLUMN — batch-режим пересоздаёт таблицу
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        render_as_batch=is_sqlite,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
