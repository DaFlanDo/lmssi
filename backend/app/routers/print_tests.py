"""Роутер печатных тестов — генерация из документа, редактирование, пакетная печать."""
from __future__ import annotations

import json
import random
import string
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_role
from app.models import User, Course
from app.models.print_test import PrintTest
from app.models.print_variant import PrintVariant
from app.schemas.print_test import (
    PrintTestRead,
    PrintTestVariant,
    PrintTestQuestion,
    PrintTestQuestionsUpdate,
    PrintTestManualCreate,
    PrintTestTitleUpdate,
    PrintVariantRead,
)
from app.services import print_test as pt_service
from app.services.generation import extract_text

router = APIRouter(prefix="/print-tests", tags=["PrintTests"])

MAX_FILE_SIZE = 10 * 1024 * 1024


def _gen_code(db: Session) -> str:
    """Генерирует уникальный 6-символьный код варианта."""
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):
        code = ''.join(random.choices(chars, k=6))
        if not db.query(PrintVariant).filter(PrintVariant.code == code).first():
            return code
    return uuid.uuid4().hex[:6].upper()


# ─── Создание теста из документа ─────────────────────────────────────────────

@router.post("/", response_model=PrintTestRead, status_code=status.HTTP_201_CREATED)
async def create_print_test(
    file: UploadFile = File(...),
    title: str = Form(""),
    topic_hint: str = Form(""),
    course_id: str = Form(""),
    questions_per_test: int = Form(10),
    user: User = Depends(require_role("hr")),
    db: Session = Depends(get_db),
):
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(400, "Файл слишком большой (максимум 10 МБ)")

    try:
        source_text = extract_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(400, f"Ошибка чтения файла: {e}")

    if len(source_text.strip()) < 100:
        raise HTTPException(400, "В документе слишком мало текста")

    try:
        questions = pt_service.generate_questions_from_document(source_text, topic_hint)
    except Exception as e:
        raise HTTPException(500, f"Ошибка генерации вопросов: {e}")

    if len(questions) < 2:
        raise HTTPException(500, "AI не смог сгенерировать достаточно вопросов")

    auto_title = title.strip() or pt_service.generate_title(source_text)

    resolved_course_id: Optional[str] = None
    if course_id.strip():
        c = db.query(Course).filter(Course.id == course_id.strip()).first()
        if c:
            resolved_course_id = c.id

    test = PrintTest(
        id=uuid.uuid4().hex,
        title=auto_title,
        topic=topic_hint.strip() or source_text[:120].replace("\n", " "),
        course_id=resolved_course_id,
        questions_pool=json.dumps(questions, ensure_ascii=False),
        questions_per_test=min(questions_per_test, len(questions)),
        created_by=user.id,
        created_at=datetime.utcnow(),
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


# ─── Ручное создание теста ────────────────────────────────────────────────────

@router.post("/manual", response_model=PrintTestRead, status_code=status.HTTP_201_CREATED)
def create_print_test_manual(
    body: PrintTestManualCreate,
    user: User = Depends(require_role("hr")),
    db: Session = Depends(get_db),
):
    title = body.title.strip()
    if not title:
        raise HTTPException(400, "Укажите название теста")

    questions = []
    for q in body.questions:
        text = q.question.strip()
        opts = [o.strip() for o in q.options if o.strip()]
        if not text or len(opts) < 2:
            continue
        ci = q.correct_index if 0 <= q.correct_index < len(opts) else 0
        questions.append({
            "id": q.id or uuid.uuid4().hex,
            "question": text,
            "options": opts,
            "correct_index": ci,
        })

    if not questions:
        raise HTTPException(400, "Добавьте хотя бы один корректный вопрос (текст и минимум 2 варианта)")

    resolved_course_id: Optional[str] = None
    if body.course_id and body.course_id.strip():
        c = db.query(Course).filter(Course.id == body.course_id.strip()).first()
        if c:
            resolved_course_id = c.id

    test = PrintTest(
        id=uuid.uuid4().hex,
        title=title,
        topic=(body.topic or "").strip() or title,
        course_id=resolved_course_id,
        questions_pool=json.dumps(questions, ensure_ascii=False),
        questions_per_test=max(1, min(body.questions_per_test, len(questions))),
        created_by=user.id,
        created_at=datetime.utcnow(),
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


# ─── Список и получение ───────────────────────────────────────────────────────

@router.get("/", response_model=List[PrintTestRead])
def list_print_tests(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    return db.query(PrintTest).order_by(PrintTest.created_at.desc()).all()


@router.get("/{test_id}", response_model=PrintTestRead)
def get_print_test(
    test_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    test = db.query(PrintTest).filter(PrintTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "Тест не найден")
    return test


# ─── Редактирование вопросов ──────────────────────────────────────────────────

@router.patch("/{test_id}", response_model=PrintTestRead)
def update_questions(
    test_id: str,
    body: PrintTestQuestionsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    test = db.query(PrintTest).filter(PrintTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "Тест не найден")

    questions = [q.model_dump() for q in body.questions]
    test.questions_pool = json.dumps(questions, ensure_ascii=False)
    test.questions_per_test = min(test.questions_per_test, len(questions))
    db.commit()
    db.refresh(test)
    return test


# ─── Переименование ──────────────────────────────────────────────────────────

@router.patch("/{test_id}/title", response_model=PrintTestRead)
def update_title(
    test_id: str,
    body: PrintTestTitleUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    test = db.query(PrintTest).filter(PrintTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "Тест не найден")
    test.title = body.title.strip()
    db.commit()
    db.refresh(test)
    return test


# ─── Пакетная печать: создать N вариантов с кодами ───────────────────────────

@router.post("/{test_id}/batch", response_model=List[PrintVariantRead])
def create_batch_variants(
    test_id: str,
    count: int = Form(1),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    test = db.query(PrintTest).filter(PrintTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "Тест не найден")
    if not (1 <= count <= 100):
        raise HTTPException(400, "Количество вариантов: от 1 до 100")

    pool = json.loads(test.questions_pool)
    n = min(test.questions_per_test, len(pool))
    variants = []

    for _ in range(count):
        selected = random.sample(pool, n)
        code = _gen_code(db)
        v = PrintVariant(
            code=code,
            test_id=test_id,
            test_title=test.title,
            questions_snapshot=json.dumps(selected, ensure_ascii=False),
            created_at=datetime.utcnow(),
        )
        db.add(v)
        variants.append(PrintVariantRead(
            code=code,
            test_id=test_id,
            test_title=test.title,
            questions=[PrintTestQuestion(**q) for q in selected],
            created_at=v.created_at,
        ))

    db.commit()
    return variants


# ─── Поиск варианта по коду ───────────────────────────────────────────────────

@router.get("/variants/{code}", response_model=PrintVariantRead)
def get_variant_by_code(
    code: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    v = db.query(PrintVariant).filter(PrintVariant.code == code.upper().strip()).first()
    if not v:
        raise HTTPException(404, "Вариант с таким кодом не найден")
    questions = json.loads(v.questions_snapshot)
    return PrintVariantRead(
        code=v.code,
        test_id=v.test_id,
        test_title=v.test_title,
        questions=[PrintTestQuestion(**q) for q in questions],
        created_at=v.created_at,
    )


# ─── Удаление теста ───────────────────────────────────────────────────────────

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_print_test(
    test_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    test = db.query(PrintTest).filter(PrintTest.id == test_id).first()
    if not test:
        raise HTTPException(404, "Тест не найден")
    db.delete(test)
    db.commit()
    return None
