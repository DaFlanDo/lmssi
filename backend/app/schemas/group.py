from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional


class CourseShort(BaseModel):
    id: str
    title: str
    description: str = ""

    model_config = {"from_attributes": True}


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None


class GroupRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    user_count: int = 0
    courses: List[CourseShort] = []
    course_count: int = 0

    model_config = {"from_attributes": True}


class GroupCourseAttach(BaseModel):
    course_id: str


class GroupCoursesReorder(BaseModel):
    course_ids: List[str]
