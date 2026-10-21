from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ChangePasswordRequest
from app.schemas.user import UserRead
from app.services.auth import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    id_number = body.identification_number.upper().strip()
    if db.query(User).filter(User.identification_number == id_number).first():
        raise HTTPException(status_code=400, detail="Пользователь с таким идентификационным номером уже существует")

    if body.group_id:
        from app.models import Group
        if not db.query(Group).filter(Group.id == body.group_id).first():
            raise HTTPException(status_code=404, detail="Группа не найдена")

    user = User(
        email=body.email,
        identification_number=id_number,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        role="student",
        group_id=body.group_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Выбранная при регистрации должность сразу выдаёт программу обучения
    # (курсы должности + курсы её отдела-предка).
    if user.group_id:
        from app.services.enrollment import enroll_user_in_group_courses
        enroll_user_in_group_courses(db, user)
        db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Аккаунт деактивирован")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Новый пароль должен содержать минимум 6 символов")
    if verify_password(body.new_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Новый пароль совпадает с текущим")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return None
