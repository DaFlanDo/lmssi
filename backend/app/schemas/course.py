from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# --- ModuleTest ---
class ModuleTestBase(BaseModel):
    id: str
    type: str = "module"  # 'module' | 'block' | 'final'
    title: str = ""
    content: str = ""   # JSON: {questions: [...], pass_threshold: 70}
    order: int = 0


class ModuleTestCreate(ModuleTestBase):
    pass


class ModuleTestRead(ModuleTestBase):
    module_id: str

    model_config = {"from_attributes": True}


# --- Block ---
class BlockBase(BaseModel):
    id: str
    type: str = "text"
    content: str = ""
    order: int = 0


class BlockCreate(BlockBase):
    pass


class BlockRead(BlockBase):
    lesson_id: str

    model_config = {"from_attributes": True}


# --- Lesson ---
class LessonBase(BaseModel):
    id: str
    title: str
    type: str = "text"
    duration: str = "15 мин"
    order: int = 0


class LessonCreate(LessonBase):
    blocks: List[BlockCreate] = []


class LessonRead(LessonBase):
    module_id: str
    blocks: List[BlockRead] = []

    model_config = {"from_attributes": True}


# --- Module ---
class ModuleBase(BaseModel):
    id: str
    title: str
    order: int = 0


class ModuleCreate(ModuleBase):
    lessons: List[LessonCreate] = []
    tests: List[ModuleTestCreate] = []


class ModuleRead(ModuleBase):
    course_id: str
    lessons: List[LessonRead] = []
    tests: List[ModuleTestRead] = []

    model_config = {"from_attributes": True}


# --- Course ---
class CourseBase(BaseModel):
    id: str
    title: str
    description: str = ""
    sequential: bool = False
    require_video: bool = False


class CourseCreate(CourseBase):
    modules: List[ModuleCreate] = []


class CourseRead(CourseBase):
    is_published: bool = False
    cover_image: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[datetime] = None
    modules: List[ModuleRead] = []

    model_config = {"from_attributes": True}


class CourseListItem(BaseModel):
    id: str
    title: str
    description: str = ""
    is_published: bool = False
    cover_image: Optional[str] = None
    created_at: Optional[datetime] = None
    module_count: int = 0
    lesson_count: int = 0

    model_config = {"from_attributes": True}
