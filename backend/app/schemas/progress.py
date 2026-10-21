from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any


class LessonProgressRead(BaseModel):
    lesson_id: str
    is_completed: bool
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TestProgressRead(BaseModel):
    test_id: str
    passed: bool = False
    best_score: int = 0


class CourseProgressRead(BaseModel):
    course_id: str
    total_lessons: int
    completed_lessons: int
    progress_percent: int
    lessons: List[LessonProgressRead] = []
    # Статус тестов для понятного гейта сертификата
    tests_total: int = 0
    tests_passed: int = 0
    certificate_eligible: bool = False
    # Пер-тестовый статус — нужен для последовательного прохождения (гейт по тесту)
    tests: List[TestProgressRead] = []


class VideoProgressReport(BaseModel):
    block_id: str
    ratio: float  # 0..1 — доля просмотра видео


class QuizSubmit(BaseModel):
    lesson_id: str
    block_id: str
    answers: Dict[str, Any]  # {"questionIndex": selectedOption}


class QuizAttemptRead(BaseModel):
    id: int
    block_id: str
    answers: Dict[str, Any]
    score: int
    passed: bool
    attempted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ModuleTestSubmit(BaseModel):
    test_id: str
    # {question_id: answer}. Ответ зависит от типа вопроса:
    #   single/boolean — int (индекс), multiple — list[int],
    #   short — str, ordering — list[int] (порядок исходных индексов).
    answers: Dict[str, Any]
    # Какие вопросы реально были показаны (банк/случайная выборка). Если задано —
    # оценка считается только по ним; иначе по всем вопросам теста.
    question_ids: Optional[List[str]] = None
    focus_violations: int = 0  # сколько раз студент покидал окно во время теста


class ModuleTestAttemptRead(BaseModel):
    id: int
    test_id: str
    answers: Dict[str, Any]
    score: int
    passed: bool
    focus_violations: int = 0
    attempted_at: Optional[datetime] = None
    new_certificate: bool = False
    certificate_number: Optional[str] = None

    model_config = {"from_attributes": True}


# ── ИИ-проверка открытого ответа ──────────────────────────────────────────────
class OpenAnswerSubmit(BaseModel):
    lesson_id: str
    block_id: str
    answer: str


class OpenAnswerResult(BaseModel):
    score: int           # 0..100
    passed: bool
    feedback: str
    answer: str
    attempted_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
