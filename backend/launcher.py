"""
LMSSI — самонастраивающийся лаунчер (точка входа для .exe).

Поведение:
  • Первый запуск  — мастер настройки: выбор БД (SQLite/PostgreSQL), нужно ли
    наполнять базу демо-данными, ключ ИИ. Генерирует .env, готовит базу, затем
    поднимает сервер и открывает браузер.
  • Повторный запуск — обнаруживает свой .env рядом с exe и просто запускает
    систему (без повторной настройки), показывая логи в консоли.

Запуск в разработке:  python launcher.py
Сборка в .exe:        scripts/build_exe.ps1  (PyInstaller, см. LMSSI.spec)
"""
from __future__ import annotations

import logging
import os
import secrets
import sys
import threading
import time
import webbrowser

HOST = "127.0.0.1"
PORT = 8000
URL = f"http://{HOST}:{PORT}"

AI_BASE_DEFAULT = "https://api.wellflow.dev/v1"
AI_MODEL_DEFAULT = "claude-sonnet-4.6"


def data_dir() -> str:
    """Каталог рядом с exe (frozen) или с этим файлом (dev). Тут живут .env, БД, uploads, логи."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def resource_dir() -> str:
    """Каталог с вшитыми ресурсами: _MEIPASS у PyInstaller, иначе папка backend."""
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def setup_logging(base: str) -> logging.Logger:
    log_path = os.path.join(base, "lmssi.log")
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler(log_path, encoding="utf-8")],
    )
    log = logging.getLogger("lmssi")
    log.info("Лог пишется в %s", log_path)
    return log


def prompt_ai_key(log: logging.Logger) -> str:
    """Ключ ИИ: из переменной окружения или интерактивно. Пустой = ИИ выключен."""
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key:
        return key
    if not sys.stdin or not sys.stdin.isatty():
        return ""
    print("\nИИ-функции (автогенерация курсов, наставник) требуют ключ OpenAI-совместимого шлюза.")
    print("Нажмите Enter, чтобы пропустить — система запустится без ИИ.")
    try:
        return input("  OPENAI_API_KEY: ").strip()
    except (EOFError, KeyboardInterrupt):
        return ""


def ask(prompt: str, default: str = "") -> str:
    """Запрос ввода с дефолтом. В неинтерактивном режиме возвращает дефолт."""
    if not sys.stdin or not sys.stdin.isatty():
        return default
    try:
        ans = input(prompt).strip()
        return ans if ans else default
    except (EOFError, KeyboardInterrupt):
        return default


def ask_yes_no(prompt: str, default: bool = True) -> bool:
    hint = "Д/н" if default else "д/Н"
    ans = ask(f"{prompt} [{hint}]: ", "").lower()
    if not ans:
        return default
    return ans in ("y", "yes", "д", "да")


def first_run_setup(base: str, env_path: str, log: logging.Logger) -> None:
    """Мастер первого запуска: выбор БД, наполнения и ключа ИИ. Пишет .env и готовит БД."""
    print("\n" + "=" * 60)
    print("  LMSSI — первичная настройка (выполняется один раз)")
    print("=" * 60)

    # 1. База данных
    print("\n[1/3] База данных:")
    print("   1) SQLite — файл рядом с программой, ничего ставить не нужно (рекомендуется)")
    print("   2) PostgreSQL — подключение к существующему серверу PostgreSQL")
    if ask("   Ваш выбор [1]: ", "1").strip() == "2":
        default_pg = "postgresql://postgres@localhost:5432/lmssi"
        dburl = ask(f"   Строка подключения ({default_pg}): ", default_pg)
        db_kind = "PostgreSQL"
        print("   (БД должна существовать, сервер — запущен.)")
    else:
        dburl = "sqlite:///" + os.path.join(base, "lms.db").replace("\\", "/")
        db_kind = "SQLite"

    # 2. Наполнение демо-данными
    print("\n[2/3] Демо-данные (курсы «Электрик», сотрудники, демо-логины):")
    do_seed = ask_yes_no("   Заполнить базу демо-данными автоматически?", True)

    # 3. Ключ ИИ
    print("\n[3/3] ИИ-функции (автогенерация курсов, наставник в уроке):")
    ai_key = prompt_ai_key(log)

    # Запись .env
    secret = secrets.token_hex(32)
    lines = [f"DATABASE_URL={dburl}", f"SECRET_KEY={secret}"]
    if ai_key:
        lines += [
            "",
            "# ИИ-шлюз (OpenAI-совместимый)",
            f"OPENAI_API_KEY={ai_key}",
            f"OPENAI_BASE_URL={os.environ.get('OPENAI_BASE_URL', AI_BASE_DEFAULT)}",
            f"OPENAI_MODEL={os.environ.get('OPENAI_MODEL', AI_MODEL_DEFAULT)}",
        ]
    with open(env_path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    log.info("Создан %s (БД: %s, демо-данные: %s, ИИ: %s)",
             env_path, db_kind, "да" if do_seed else "нет", "включён" if ai_key else "выключен")

    # Инициализация: таблицы + админ всегда; демо-данные — по выбору.
    import runpy

    scripts = ["create_admin.py"]
    if do_seed:
        scripts += ["seed_demo.py"]
    for script in scripts:
        path = os.path.join(resource_dir(), script)
        if not os.path.isfile(path):
            log.warning("Пропускаю %s — не найден", script)
            continue
        log.info("Инициализация БД: %s…", script)
        try:
            runpy.run_path(path, run_name="__main__")
        except Exception:  # noqa: BLE001 — сидинг не должен ронять запуск
            log.exception("Ошибка в %s (продолжаю)", script)
    log.info("Настройка завершена.")


def open_browser_when_ready(log: logging.Logger) -> None:
    import urllib.request

    for _ in range(60):
        try:
            urllib.request.urlopen(URL, timeout=1)
            break
        except Exception:  # noqa: BLE001
            time.sleep(0.5)
    log.info("Открываю браузер: %s", URL)
    try:
        webbrowser.open(URL)
    except Exception:  # noqa: BLE001
        log.info("Не удалось открыть браузер автоматически — откройте вручную: %s", URL)


def main() -> None:
    base = data_dir()
    os.chdir(base)  # .env, БД и uploads — относительно каталога рядом с exe
    log = setup_logging(base)
    log.info("LMSSI — каталог данных: %s", base)

    env_path = os.path.join(base, ".env")
    configured = os.path.isfile(env_path)

    # Фронтенд: вшитый каталог имеет приоритет (режим exe).
    bundled_front = os.path.join(resource_dir(), "frontend_dist")
    if os.path.isdir(bundled_front):
        os.environ["LMSSI_FRONTEND_DIST"] = bundled_front

    if not configured:
        first_run_setup(base, env_path, log)
    else:
        log.info("Конфигурация найдена (%s) — запускаю систему.", env_path)

    # Импорт приложения только ПОСЛЕ создания .env (config читает его при импорте).
    sys.path.insert(0, resource_dir())
    import uvicorn

    threading.Thread(target=open_browser_when_ready, args=(log,), daemon=True).start()

    log.info("Сервер запускается на %s  (Ctrl+C — остановить)", URL)
    uvicorn.run("app.main:app", host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
