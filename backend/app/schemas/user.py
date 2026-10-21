from __future__ import annotations
from pydantic import BaseModel, EmailStr, model_validator
from datetime import datetime
from typing import Optional


class UserRead(BaseModel):
    id: int
    email: EmailStr
    identification_number: Optional[str] = None
    full_name: str
    role: str
    is_active: bool
    group_id: Optional[int] = None
    group_name: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_relations(cls, obj):
        # SQLAlchemy model — inject related names from relationships
        if hasattr(obj, "__table__"):
            data = {c.key: getattr(obj, c.key) for c in obj.__table__.columns}
            data["group_name"] = obj.group.name if getattr(obj, "group", None) else None
            return data
        return obj


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    group_id: Optional[int] = None


class ProfileUpdate(BaseModel):
    """Самостоятельное редактирование своего профиля пользователем."""
    full_name: Optional[str] = None


class PasswordReset(BaseModel):
    """Сброс пароля пользователю администратором."""
    new_password: str
