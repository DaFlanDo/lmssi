from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional


class PrintTestQuestion(BaseModel):
    id: str
    question: str
    options: List[str]
    correct_index: int


class PrintTestRead(BaseModel):
    id: str
    title: str
    topic: str
    course_id: Optional[str] = None
    questions_pool: str
    questions_per_test: int
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PrintTestVariant(BaseModel):
    test_id: str
    title: str
    questions: List[PrintTestQuestion]
    questions_per_test: int
    total_pool: int


class PrintTestQuestionsUpdate(BaseModel):
    questions: List[PrintTestQuestion]


class PrintTestManualCreate(BaseModel):
    title: str
    topic: Optional[str] = ""
    course_id: Optional[str] = None
    questions_per_test: int = 10
    questions: List[PrintTestQuestion]


class PrintTestTitleUpdate(BaseModel):
    title: str


class PrintVariantRead(BaseModel):
    code: str
    test_id: str
    test_title: str
    questions: List[PrintTestQuestion]
    created_at: Optional[datetime] = None
