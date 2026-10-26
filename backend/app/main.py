from __future__ import annotations
import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import get_settings
from app.db_migrate import run_migrations
from app.routers import auth, users, groups, courses, enrollments, progress, upload, generation, ai_assistant, certificates
from app.routers import print_tests, notifications, org_settings

# Импортируем все модели, чтобы Base.metadata знал о них
import app.models  # noqa: F401

settings = get_settings()

app = FastAPI(
    title="LMSSI API",
    description="Корпоративная LMS с ИИ-генерацией курсов",
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

# Схема БД — через Alembic (app/migrations), см. app/db_migrate.py
run_migrations()

# Настройки организации по умолчанию (одна строка с id=1)
from app.models.org_settings import OrgSettings as _OrgSettings
from app.database import SessionLocal as _SessionLocal
with _SessionLocal() as _db:
    if not _db.get(_OrgSettings, 1):
        _db.add(_OrgSettings(id=1))
        _db.commit()

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
