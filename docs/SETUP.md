# Установка и запуск

Короткий вариант — в [README](../README.md#запуск). Здесь всё подробно.

## Docker (PostgreSQL + backend + собранный фронт)

```bash
cp .env.docker.example .env     # вписать SECRET_KEY (openssl rand -hex 32)
docker compose up --build       # http://localhost:8000
```

Демо-данные загружаются автоматически (`SEED_DEMO=1`), логины — ниже.

## Без Docker

Нужны заранее установленные **Python 3.9+** и **Node.js 18+**.

### macOS / Linux

```bash
chmod +x scripts/*.sh           # один раз — сделать скрипты исполняемыми
./scripts/setup.sh              # установка + демо-данные (SQLite)
./scripts/start.sh              # запуск backend :8000 + frontend :5173
```

### Windows (PowerShell)

```powershell
# если скрипты заблокированы политикой — один раз:
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

.\scripts\setup.ps1             # установка + демо-данные (SQLite)
.\scripts\start.ps1             # запуск backend :8000 + frontend :5173
```

После запуска открыть **http://localhost:5173**.
API и Swagger-документация — **http://localhost:8000/docs**.

> Во время установки скрипт спросит **`OPENAI_API_KEY`** — он нужен для
> автогенерации курсов и ИИ-наставника. Можно нажать Enter и пропустить:
> система запустится без ИИ-функций, ключ добавляется в `backend/.env` позже.
> Ключ также можно задать заранее через переменную окружения `OPENAI_API_KEY`.

## Флаги установки

| macOS / Linux                    | Windows                         | Что делает                              |
|----------------------------------|---------------------------------|-----------------------------------------|
| `./scripts/setup.sh`             | `.\scripts\setup.ps1`           | SQLite + демо-данные (рекомендуется)    |
| `./scripts/setup.sh --postgres`  | `.\scripts\setup.ps1 -Postgres` | PostgreSQL, создаёт БД `lmssi`          |
| `./scripts/setup.sh --no-seed`   | `.\scripts\setup.ps1 -NoSeed`   | Без демо-данных (только админ и отделы) |
| `./scripts/setup.sh --run`       | `.\scripts\setup.ps1 -Run`      | Установить и сразу запустить серверы    |

---

## Демо-логины

После установки с демо-данными доступны:

| Логин                | Пароль       | Роль                  |
|----------------------|--------------|-----------------------|
| `admin@nordbyte.dev`   | `admin123`   | Администратор         |
| `hr@nordbyte.dev`      | `hr123`      | HR / методист         |
| `a.sidorov@nordbyte.dev` | `student123` | Сотрудник |

> Смените пароли перед реальным использованием.

---

## Переменные окружения

Файл `backend/.env` создаётся скриптом автоматически. Шаблон со всеми
параметрами и комментариями — `backend/.env.example`. Основные переменные:

| Переменная       | Назначение                                  | По умолчанию             |
|------------------|---------------------------------------------|--------------------------|
| `DATABASE_URL`   | Строка подключения к БД                     | `sqlite:///./lms.db`     |
| `SECRET_KEY`     | Секрет подписи JWT (`openssl rand -hex 32`) | генерируется при setup   |
| `OPENAI_API_KEY` | Ключ ИИ-шлюза (генерация курсов, наставник) | спрашивается при setup; без него ИИ выключен |
| `OPENAI_BASE_URL`| URL OpenAI-совместимого шлюза               | `https://api.wellflow.dev/v1` |
| `OPENAI_MODEL`   | Модель                                      | `claude-sonnet-4.6`      |
| `UPLOAD_DIR`     | Каталог загрузок и SVG                      | `uploads`                |

Подключить PostgreSQL вручную:

```env
DATABASE_URL=postgresql://ПОЛЬЗОВАТЕЛЬ@localhost:5432/lmssi
```

---

## Сборка в один .exe (Windows)

Для демонстрации без установки Python/Node можно собрать **один
самонастраивающийся `LMSSI.exe`**. При первом запуске он спросит ключ ИИ,
создаст базу с демо-данными и откроет браузер; при повторном — найдёт свой
`.env` рядом и просто запустит систему (с логами в консоли).

```powershell
.\scripts\build_exe.ps1          # соберёт dist\LMSSI.exe
```

Что происходит: фронтенд собирается (`npm run build`), а затем PyInstaller
по [`LMSSI.spec`](LMSSI.spec) вшивает Python, бэкенд, собранный фронт и
seed-скрипты в один файл. Точка входа — [`backend/launcher.py`](backend/launcher.py).

Рядом с `LMSSI.exe` при запуске появляются `.env`, `lms.db`, `uploads\` и
`lmssi.log`. База — SQLite (PostgreSQL в exe не вшивается). Чтобы пересоздать
демо «с нуля», удалите эти файлы и запустите exe снова.

> `.exe` собирается только на Windows. На macOS/Linux получится бинарь
> соответствующей ОС (тот же `build`-процесс, но через `pyinstaller LMSSI.spec`).

---

## Ручная установка (без скриптов)

<details>
<summary>Backend</summary>

```bash
cd backend
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                # затем вписать SECRET_KEY: openssl rand -hex 32
                                    # (без него backend не запустится)
python create_admin.py              # таблицы + админ + отделы
python seed_demo.py                 # демо-пользователи и курсы (опционально)
python seed_electrician.py          # курсы «Электрик» + SVG-схемы (опционально)
python run.py                       # http://localhost:8000
```
</details>

<details>
<summary>Frontend</summary>

```bash
cd frontend
npm install
npm run dev                         # http://localhost:5173
# production-сборка:
npm run build && npm run preview
```
</details>

---

## Полезное

- **Документация API:** http://localhost:8000/docs (Swagger UI).
- **Сбросить базу (SQLite):** удалить `backend/lms.db` и заново выполнить
  `python create_admin.py` + seed-скрипты.
- **Тесты backend:** `cd backend && pip install -r requirements-dev.txt && pytest`.
  Каждый тест работает на отдельной SQLite-базе, ИИ не вызывается.
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) — тесты, проверка миграций,
  линтер и сборка фронта, сборка Docker-образа.
- **Миграции БД (Alembic):** применяются автоматически при старте backend.
  Новая миграция после изменения моделей:
  `cd backend && python -m alembic revision --autogenerate -m "описание"`.
  Старые базы, созданные до перехода на Alembic, подхватываются без потери данных.
- **Проверка кода frontend:** `cd frontend && npm run lint`.
- **Порты:** backend 8000, frontend 5173 — задаются в `backend/run.py` и
  `frontend/vite.config.ts`; CORS-источники — в `backend/app/config.py`.
