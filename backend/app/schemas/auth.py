from __future__ import annotations
from pydantic import BaseModel, EmailStr
from typing import Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from app.schemas.user import UserRead


class RegisterRequest(BaseModel):
    email: EmailStr
    identification_number: str
    full_name: str
    password: str
    group_id: Optional[int] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"


from app.schemas.user import UserRead  # noqa: E402
TokenResponse.model_rebuild()
