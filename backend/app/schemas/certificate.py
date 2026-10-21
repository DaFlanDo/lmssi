from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class CertificateRead(BaseModel):
    id: int
    certificate_number: str
    user_id: int
    course_id: str
    issued_at: Optional[datetime] = None
    score: Optional[int] = None

    model_config = {"from_attributes": True}


class CertificateDetail(BaseModel):
    """Расширенная информация для страницы сертификата и верификации."""
    certificate_number: str
    issued_at: Optional[datetime] = None
    score: Optional[int] = None

    user_full_name: str
    course_id: str
    course_title: str
    course_description: str

    # Подсчёт уроков
    total_lessons: int
    # Дата завершения курса (последний завершённый урок) — может совпадать с issued_at
    completed_at: Optional[datetime] = None


class CertificateVerification(BaseModel):
    """Публичный ответ верификации (без чувствительных данных)."""
    valid: bool
    certificate_number: str
    user_full_name: Optional[str] = None
    course_title: Optional[str] = None
    issued_at: Optional[datetime] = None
    score: Optional[int] = None