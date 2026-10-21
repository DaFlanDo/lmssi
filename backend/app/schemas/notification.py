from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationRead(BaseModel):
    id: int
    type: str
    title: str
    message: str
    is_read: bool
    created_at: Optional[datetime] = None
    related_course_id: Optional[str] = None

    model_config = {"from_attributes": True}


class UnreadCountRead(BaseModel):
    count: int
