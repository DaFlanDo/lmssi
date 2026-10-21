"""Сервис выдачи сертификатов."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import (
    Block,
    Certificate,
    Course,
    Enrollment,
    Lesson,
    Module,
    ModuleTest,
    ModuleTestAttempt,
    QuizAttempt,
)
from app.services.progress import calculate_course_progress


def _generate_certificate_number(db: Session) -> str:
    """LMS-YYYY-NNNNNN — последовательный человекочитаемый номер."""
    year = datetime.now(timezone.utc).year
    count = db.query(func.count(Certificate.id)).scalar() or 0
    return f"LMS-{year}-{count + 1:06d}"


def _calculate_average_score(db: Session, user_id: int, course_id: str) -> Optional[int]:
    """Средний балл по всем квизам курса для пользователя (0..100).

    Берём только последнюю попытку для каждого блока-квиза. Если квизов нет — None.
    """
    quiz_blocks = (
        db.query(Block.id)
        .join(Lesson, Block.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course_id, Block.type == "quiz")
        .all()
    )
    block_ids = [b[0] for b in quiz_blocks]
    if not block_ids:
        return None

    scores: list[int] = []
    for bid in block_ids:
        last_attempt = (
            db.query(QuizAttempt)
            .filter(QuizAttempt.user_id == user_id, QuizAttempt.block_id == bid)
            .order_by(QuizAttempt.attempted_at.desc())
            .first()
        )
        if last_attempt:
            scores.append(last_attempt.score)
        else:
            scores.append(0)

    if not scores:
        return None
    return round(sum(scores) / len(scores))


def _all_required_tests_passed(db: Session, user_id: int, course_id: str) -> bool:
    """Проверяет, что все тесты модулей и итоговый тест пройдены."""
    required_tests = (
        db.query(ModuleTest)
        .join(Module, ModuleTest.module_id == Module.id)
        .filter(Module.course_id == course_id)
        .all()
    )
    if not required_tests:
        return True
    for test in required_tests:
        passing = (
            db.query(ModuleTestAttempt)
            .filter(
                ModuleTestAttempt.user_id == user_id,
                ModuleTestAttempt.test_id == test.id,
                ModuleTestAttempt.passed == True,
            )
            .first()
        )
        if not passing:
            return False
    return True


def issue_certificate_if_eligible(
    db: Session, user_id: int, course_id: str
) -> Optional[Certificate]:
    """Выдать сертификат, если курс пройден на 100% и сертификат ещё не выдан.

    Также помечает Enrollment как completed.
    Возвращает Certificate (новый или существующий), либо None если ещё не пройден.
    """
    # Уже есть?
    existing = (
        db.query(Certificate)
        .filter(Certificate.user_id == user_id, Certificate.course_id == course_id)
        .first()
    )
    if existing:
        return existing

    total, completed, percent = calculate_course_progress(db, user_id, course_id)
    if total == 0 or percent < 100:
        return None

    if not _all_required_tests_passed(db, user_id, course_id):
        return None

    # Курс должен существовать
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        return None

    score = _calculate_average_score(db, user_id, course_id)

    cert = Certificate(
        certificate_number=_generate_certificate_number(db),
        user_id=user_id,
        course_id=course_id,
        score=score,
    )
    db.add(cert)

    # Помечаем enrollment как завершённый
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if enrollment and not enrollment.completed_at:
        enrollment.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(cert)
    return cert