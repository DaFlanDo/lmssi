# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller-спек для LMSSI. Собирает один self-contained .exe из лаунчера:
вшивает Python, бэкенд (FastAPI), собранный фронтенд и seed-скрипты.

Сборка (на Windows, из корня проекта):
    scripts\\build_exe.ps1
или вручную:
    pyinstaller LMSSI.spec --noconfirm

Перед сборкой фронтенд должен быть собран в frontend/dist
(build_exe.ps1 делает это сам).
"""
import os
import sys

from PyInstaller.utils.hooks import collect_submodules, collect_all

ROOT = os.path.abspath(os.getcwd())
BACKEND = os.path.join(ROOT, "backend")
FRONTEND_DIST = os.path.join(ROOT, "frontend", "dist")

# Чтобы collect_submodules('app') нашёл пакет бэкенда.
sys.path.insert(0, BACKEND)

# --- Данные: собранный фронт + seed-скрипты (запускаются на первом старте) ---
datas = [
    (FRONTEND_DIST, "frontend_dist"),
    (os.path.join(BACKEND, "create_admin.py"), "."),
    (os.path.join(BACKEND, "seed_demo.py"), "."),
    (os.path.join(BACKEND, "seed_electrician.py"), "."),
    (os.path.join(BACKEND, "seed_electrician_svgs.py"), "."),
    # Alembic читает миграции с диска, а не из PYZ — кладём каталог рядом
    (os.path.join(BACKEND, "app", "migrations"), os.path.join("app", "migrations")),
]
binaries = []
hiddenimports = collect_submodules("app")

# Пакеты с динамическими импортами / данными — собираем целиком.
for pkg in ("uvicorn", "passlib", "jose", "pypdf", "docx", "email_validator", "alembic"):
    try:
        d, b, h = collect_all(pkg)
        datas += d
        binaries += b
        hiddenimports += h
    except Exception:
        pass

hiddenimports += [
    "passlib.handlers.bcrypt",
    "bcrypt",
    "uvicorn.logging",
    "uvicorn.loops.auto",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan.on",
]

block_cipher = None

a = Analysis(
    [os.path.join(BACKEND, "launcher.py")],
    pathex=[BACKEND],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="LMSSI",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    runtime_tmpdir=None,
    console=True,  # консольный exe — чтобы видеть логи и вводить ключ ИИ
    disable_windowed_traceback=False,
    icon=None,
)
