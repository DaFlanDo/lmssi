"""Роутер сертификатов: список, выдача (явная), верификация (публичная)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Certificate, Course, LessonProgress, Lesson, Module, User
from app.schemas.certificate import (
    CertificateDetail,
    CertificateRead,
    CertificateVerification,
)
from app.services.certificates import issue_certificate_if_eligible

router = APIRouter(prefix="/certificates", tags=["Certificates"])


# ─── Список моих сертификатов ───────────────────────────────────────────────
@router.get("/me", response_model=list[CertificateRead])
def my_certificates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Certificate)
        .filter(Certificate.user_id == user.id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )


# ─── Попытаться выдать сертификат (если курс пройден) ───────────────────────
@router.post("/issue/{course_id}", response_model=CertificateRead)
def issue_certificate(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cert = issue_certificate_if_eligible(db, user.id, course_id)
    if not cert:
        raise HTTPException(
            status_code=400,
            detail="Курс ещё не пройден на 100% — сертификат не может быть выдан",
        )
    return cert


# ─── Подробная информация о моём сертификате ────────────────────────────────
@router.get("/by-number/{certificate_number}", response_model=CertificateDetail)
def get_certificate_detail(
    certificate_number: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cert = (
        db.query(Certificate)
        .filter(Certificate.certificate_number == certificate_number)
        .first()
    )
    if not cert:
        raise HTTPException(404, "Сертификат не найден")
    if cert.user_id != user.id and user.role != "hr":
        raise HTTPException(403, "Нет доступа")

    course = cert.course
    owner = cert.user

    total_lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == cert.course_id)
        .count()
    )

    last_progress = (
        db.query(LessonProgress)
        .join(Lesson, LessonProgress.lesson_id == Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .filter(
            Module.course_id == cert.course_id,
            LessonProgress.user_id == cert.user_id,
            LessonProgress.is_completed == True,
        )
        .order_by(LessonProgress.completed_at.desc())
        .first()
    )

    return CertificateDetail(
        certificate_number=cert.certificate_number,
        issued_at=cert.issued_at,
        score=cert.score,
        user_full_name=owner.full_name,
        course_id=course.id,
        course_title=course.title,
        course_description=course.description or "",
        total_lessons=total_lessons,
        completed_at=last_progress.completed_at if last_progress else cert.issued_at,
    )


# ─── ПУБЛИЧНАЯ верификация (без авторизации) ────────────────────────────────
@router.get("/verify/{certificate_number}", response_model=CertificateVerification)
def verify_certificate(
    certificate_number: str,
    db: Session = Depends(get_db),
):
    """Открытый эндпоинт для проверки подлинности сертификата по номеру.

    Используется со страницы /verify/:number, куда ведёт QR-код на сертификате.
    """
    cert = (
        db.query(Certificate)
        .filter(Certificate.certificate_number == certificate_number)
        .first()
    )
    if not cert:
        return CertificateVerification(
            valid=False,
            certificate_number=certificate_number,
        )

    return CertificateVerification(
        valid=True,
        certificate_number=cert.certificate_number,
        user_full_name=cert.user.full_name if cert.user else None,
        course_title=cert.course.title if cert.course else None,
        issued_at=cert.issued_at,
        score=cert.score,
    )