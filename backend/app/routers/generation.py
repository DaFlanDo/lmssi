"""Роутер генерации курса из документа."""
from __future__ import annotations

import threading
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.database import SessionLocal
from app.dependencies import require_role
from app.models import User, Course, Module, Lesson, Block, ModuleTest
from app.services import generation as gen_service

router = APIRouter(prefix="/generation", tags=["Generation"])

MAX_FILE_SIZE = 50 * 1024 * 1024

# ── In-memory job store ──────────────────────────────────────────────────────
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


class StartResponse(BaseModel):
    job_id: str


class AnalyzeResponse(BaseModel):
    chars: int                 # сколько значимого текста извлеклось
    suggested_max_lessons: int # сколько уроков осмысленно раскрыть из материала


class JobStatus(BaseModel):
    job_id: str
    status: str          # "running" | "done" | "error"
    done: int = 0
    total: int = 0
    message: str = ""
    course_id: Optional[str] = None
    error: Optional[str] = None


def _update_job(job_id: str, **kwargs) -> None:
    with _jobs_lock:
        _jobs[job_id].update(kwargs)


def _generation_thread(
    job_id: str,
    file_data: bytes,
    filename: str,
    modules_count: int,
    lessons_per_module: int,
    include_quiz: bool,
    course_title_hint: str,
    user_id: int,
    tone: str = "official",
    level: str = "novice",
    include_final_test: bool = False,
) -> None:
    """Выполняется в фоновом потоке, обновляет _jobs[job_id]."""
    try:
        # ── 1. Извлечение текста ─────────────────────────────────────────────
        _update_job(job_id, message="Извлекаем текст из документа...")
        try:
            source_text = gen_service.extract_text(filename, file_data)
        except ValueError as e:
            _update_job(job_id, status="error", error=str(e))
            return
        except Exception as e:
            _update_job(job_id, status="error", error=f"Ошибка парсинга файла: {e}")
            return

        if len(source_text.strip()) < 200:
            _update_job(job_id, status="error", error="В файле слишком мало текста для генерации курса")
            return

        # ── 2. Структура курса ───────────────────────────────────────────────
        _update_job(job_id, message="Строим структуру курса...")
        try:
            outline = gen_service.generate_outline(
                source_text=source_text,
                modules_count=modules_count,
                lessons_per_module=lessons_per_module,
                course_title_hint=course_title_hint or None,
                tone=tone,
                level=level,
            )
        except RuntimeError as e:
            _update_job(job_id, status="error", error=str(e))
            return
        except Exception as e:
            _update_job(job_id, status="error", error=f"Ошибка генерации структуры: {e}")
            return

        total_lessons = sum(len(m.get("lessons", [])) for m in outline.get("modules", []))
        total_tests = len(outline.get("modules", [])) if include_quiz else 0
        final_test_count = 1 if include_final_test else 0
        _update_job(job_id, total=total_lessons + total_tests + final_test_count, done=0,
                    message="Генерируем уроки...")

        def on_progress(done: int, total: int, message: str) -> None:
            _update_job(job_id, done=done, total=total, message=message)

        # ── 3. Контент уроков + тесты ────────────────────────────────────────
        try:
            payload = gen_service.build_course_payload(
                outline=outline,
                source_text=source_text,
                include_quiz=include_quiz,
                on_progress=on_progress,
                tone=tone,
                level=level,
                include_final_test=include_final_test,
            )
        except Exception as e:
            _update_job(job_id, status="error", error=f"Ошибка генерации контента: {e}")
            return

        # ── 4. Сохранение в БД ───────────────────────────────────────────────
        _update_job(job_id, message="Сохраняем курс в базу данных...")
        db = SessionLocal()
        try:
            course = Course(
                id=payload["id"],
                title=payload["title"],
                description=payload["description"],
                created_by=user_id,
            )
            db.add(course)

            for mod_data in payload["modules"]:
                mod = Module(
                    id=mod_data["id"],
                    title=mod_data["title"],
                    order=mod_data["order"],
                    course_id=course.id,
                )
                db.add(mod)
                for les_data in mod_data["lessons"]:
                    les = Lesson(
                        id=les_data["id"],
                        title=les_data["title"],
                        type=les_data["type"],
                        duration=les_data["duration"],
                        order=les_data["order"],
                        module_id=mod.id,
                    )
                    db.add(les)
                    for blk_data in les_data["blocks"]:
                        db.add(Block(
                            id=blk_data["id"],
                            type=blk_data["type"],
                            content=blk_data["content"],
                            order=blk_data["order"],
                            lesson_id=les.id,
                        ))
                for test_data in mod_data.get("tests", []):
                    db.add(ModuleTest(
                        id=test_data["id"],
                        type=test_data["type"],
                        title=test_data["title"],
                        content=test_data["content"],
                        order=test_data["order"],
                        module_id=mod.id,
                    ))

            db.commit()
            _update_job(job_id, status="done", course_id=payload["id"], message="Курс готов!")
        except Exception as e:
            db.rollback()
            _update_job(job_id, status="error", error=f"Ошибка сохранения в БД: {e}")
        finally:
            db.close()

    except Exception as e:
        _update_job(job_id, status="error", error=f"Неожиданная ошибка: {e}")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_file(
    file: UploadFile = File(...),
    user: User = Depends(require_role("hr")),
):
    """Извлекает текст и оценивает, на какой объём курса хватит материала.

    Вызывается на шаге выбора параметров, чтобы предупредить пользователя,
    если он выбрал объём больше, чем реально раскрывает документ.
    """
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Файл слишком большой (максимум 50 МБ)")
    try:
        text = gen_service.extract_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception:
        raise HTTPException(400, "Не удалось прочитать файл")

    return AnalyzeResponse(
        chars=len(text.strip()),
        suggested_max_lessons=gen_service.estimate_lesson_capacity(text),
    )


@router.post("/generate", response_model=StartResponse)
async def generate_course(
    file: UploadFile = File(...),
    modules_count: int = Form(3),
    lessons_per_module: int = Form(3),
    include_quiz: bool = Form(True),
    course_title_hint: str = Form(""),
    tone: str = Form("official"),
    level: str = Form("novice"),
    include_final_test: bool = Form(False),
    user: User = Depends(require_role("hr")),
):
    """Запускает фоновую генерацию, возвращает job_id для опроса прогресса."""
    if not (1 <= modules_count <= 10):
        raise HTTPException(400, "modules_count должен быть от 1 до 10")
    if not (1 <= lessons_per_module <= 8):
        raise HTTPException(400, "lessons_per_module должен быть от 1 до 8")
    if tone not in ("official", "friendly", "concise"):
        tone = "official"
    if level not in ("novice", "experienced"):
        level = "novice"

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Файл слишком большой (максимум 50 МБ)")

    job_id = uuid.uuid4().hex
    with _jobs_lock:
        _jobs[job_id] = {
            "status": "running",
            "done": 0,
            "total": 0,
            "message": "Запускаем генерацию...",
            "course_id": None,
            "error": None,
        }

    threading.Thread(
        target=_generation_thread,
        args=(job_id, data, file.filename or "", modules_count, lessons_per_module,
              include_quiz, course_title_hint, user.id, tone, level, include_final_test),
        daemon=True,
    ).start()

    return StartResponse(job_id=job_id)


@router.get("/status/{job_id}", response_model=JobStatus)
async def get_generation_status(
    job_id: str,
    user: User = Depends(require_role("hr")),
):
    """Текущий статус и прогресс генерации."""
    with _jobs_lock:
        job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Задача не найдена")
    return JobStatus(job_id=job_id, **job)
