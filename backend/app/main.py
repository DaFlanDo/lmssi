from __future__ import annotations
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from sqlalchemy import text as sa_text
from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, users, groups, courses, enrollments, progress, upload, generation, ai_assistant, certificates
from app.routers import print_tests, notifications, org_settings

# Импортируем все модели, чтобы Base.metadata знал о них
import app.models  # noqa: F401

settings = get_settings()

app = FastAPI(
    title="LMSSI API",
    description="LMS для ОАО «Барановичхлебпродукт»",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=settings.upload_dir), name="static")

# Собранный фронтенд (SPA). Отдаётся, когда dist доступен — режим exe/прод.
# Источник: переменная LMSSI_FRONTEND_DIST, либо bundled-каталог PyInstaller,
# либо ../frontend/dist при локальной сборке. В dev (Vite на :5173) — не нужен.
_FRONTEND_DIST = os.environ.get("LMSSI_FRONTEND_DIST")
if not _FRONTEND_DIST:
    _meipass = getattr(sys, "_MEIPASS", None)
    _candidate = (
        os.path.join(_meipass, "frontend_dist") if _meipass
        else os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
    )
    if os.path.isdir(_candidate):
        _FRONTEND_DIST = _candidate
SERVE_SPA = bool(_FRONTEND_DIST and os.path.isdir(_FRONTEND_DIST))

# Create tables (will be replaced by Alembic migrations)
Base.metadata.create_all(bind=engine)

# SQLite safe migrations: добавляем колонки в существующие таблицы
_migrations = [
    "ALTER TABLE enrollments ADD COLUMN due_date DATETIME",
    "ALTER TABLE users ADD COLUMN position_id INTEGER",
    "ALTER TABLE module_test_attempts ADD COLUMN focus_violations INTEGER DEFAULT 0",
    "ALTER TABLE courses ADD COLUMN sequential BOOLEAN DEFAULT false",
    "ALTER TABLE courses ADD COLUMN require_video BOOLEAN DEFAULT false",
]
# Seed default org settings
from app.models.org_settings import OrgSettings as _OrgSettings
from app.database import SessionLocal as _SessionLocal
try:
    _db = _SessionLocal()
    if not _db.query(_OrgSettings).filter(_OrgSettings.id == 1).first():
        _db.add(_OrgSettings(id=1))
        _db.commit()
    _db.close()
except Exception:
    pass

for _sql in _migrations:
    try:
        with engine.connect() as _conn:
            _conn.execute(sa_text(_sql))
            _conn.commit()
    except Exception:
        pass

# Перенос данных из устаревших Position в иерархию Group (best-effort).
# Сопоставление по совпадению имён; выполняется один раз, дубли игнорируются.
# Таблицы positions/position_course и колонка users.position_id остаются
# в БД «спящими» — не дропаем, чтобы не терять данные.
_data_migrations = [
    # Курсы должности → курсы одноимённой группы
    'INSERT INTO group_course (group_id, course_id, "order") '
    'SELECT g.id, pc.course_id, pc."order" FROM position_course pc '
    'JOIN positions p ON p.id = pc.position_id '
    'JOIN groups g ON g.name = p.name '
    'WHERE NOT EXISTS (SELECT 1 FROM group_course gc '
    '  WHERE gc.group_id = g.id AND gc.course_id = pc.course_id)',
    # Должность пользователя → одноимённая группа, если группа не задана
    'UPDATE users SET group_id = ('
    '  SELECT g.id FROM groups g JOIN positions p ON g.name = p.name '
    '  WHERE p.id = users.position_id LIMIT 1) '
    'WHERE group_id IS NULL AND position_id IS NOT NULL',
]
for _sql in _data_migrations:
    try:
        with engine.connect() as _conn:
            _conn.execute(sa_text(_sql))
            _conn.commit()
    except Exception:
        pass

# Routers — all under /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(groups.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(enrollments.router, prefix="/api")
app.include_router(progress.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(ai_assistant.router, prefix="/api")
app.include_router(certificates.router, prefix="/api")
app.include_router(print_tests.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(org_settings.router, prefix="/api")


@app.get("/")
def root():
    if SERVE_SPA:
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))
    return {"message": "LMSSI API is running", "docs": "/docs"}


# SPA catch-all: всё, что не /api, /static, /docs — отдаём из собранного фронта,
# с фолбэком на index.html для клиентских маршрутов React Router.
if SERVE_SPA:
    class _SPAStaticFiles(StaticFiles):
        async def get_response(self, path, scope):
            try:
                return await super().get_response(path, scope)
            except StarletteHTTPException as exc:
                if exc.status_code == 404:
                    return await super().get_response("index.html", scope)
                raise

    app.mount("/", _SPAStaticFiles(directory=_FRONTEND_DIST, html=True), name="spa")
