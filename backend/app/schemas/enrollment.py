from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EnrollmentCreate(BaseModel):
    user_id: int
    course_id: str
    due_date: Optional[datetime] = None


class GroupEnrollmentCreate(BaseModel):
    group_id: int
    course_id: str
    due_date: Optional[datetime] = None


class GroupEnrollmentResult(BaseModel):
    enrolled: int       # сколько новых назначений создано
    skipped: int        # уже были назначены


class EnrollmentRead(BaseModel):
    id: int
    user_id: int
    course_id: str
    assigned_by: Optional[int] = None
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


class UserEnrollmentDetail(BaseModel):
    """Расширенная информация о назначении: курс + прогресс."""
    enrollment_id: int
    course_id: str
    course_title: str
    course_description: str
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    total_lessons: int
    completed_lessons: int
    progress_percent: int
