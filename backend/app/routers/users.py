from __future__ import annotations
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Group
from app.models.enrollment import Enrollment
from app.models.certificate import Certificate
from app.models.course import Course
from app.schemas.user import UserRead, UserUpdate, ProfileUpdate, PasswordReset
from app.dependencies import get_current_user, require_roles
from app.services.auth import hash_password
from app.services.progress import calculate_course_progress
from app.services.enrollment import enroll_user_in_group_courses

router = APIRouter(prefix="/users", tags=["Users"])


def _to_read(user: User) -> UserRead:
    data = UserRead.model_validate(user)
    if user.group:
        data.group_name = user.group.name
    return data


@router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("hr")),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [_to_read(u) for u in users]


@router.patch("/me", response_model=UserRead)
def update_my_profile(
    body: ProfileUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Самостоятельное редактирование собственного профиля."""
    if body.full_name is not None:
        name = body.full_name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Имя не может быть пустым")
        current.full_name = name
    db.commit()
    db.refresh(current)
    return _to_read(current)


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    total_users = db.query(User).count()
    by_role = {
        "admin": db.query(User).filter(User.role == "admin").count(),
        "hr": db.query(User).filter(User.role == "hr").count(),
        "student": db.query(User).filter(User.role == "student").count(),
    }
    active = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    total_groups = db.query(Group).count()
    return {
        "total_users": total_users,
        "by_role": by_role,
        "active_users": active,
        "total_groups": total_groups,
    }


@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    by_role = {
        "admin": db.query(User).filter(User.role == "admin").count(),
        "hr": db.query(User).filter(User.role == "hr").count(),
        "student": db.query(User).filter(User.role == "student").count(),
    }
    total_enrollments = db.query(Enrollment).count()
    total_certificates = db.query(Certificate).count()
    total_groups = db.query(Group).count()

    recent_users = (
        db.query(User)
        .order_by(User.created_at.desc())
        .limit(7)
        .all()
    )

    top_courses = (
        db.query(Course.id, Course.title, func.count(Enrollment.id).label("count"))
        .join(Enrollment, Course.id == Enrollment.course_id, isouter=True)
        .group_by(Course.id, Course.title)
        .order_by(func.count(Enrollment.id).desc())
        .limit(5)
        .all()
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "by_role": by_role,
        "total_enrollments": total_enrollments,
        "total_certificates": total_certificates,
        "total_groups": total_groups,
        "recent_users": [
            {
                "id": u.id,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in recent_users
        ],
        "top_courses": [
            {"id": c.id, "title": c.title, "enrollment_count": c.count}
            for c in top_courses
        ],
    }


@router.get("/hr-analytics")
def get_hr_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("hr")),
):
    """Аналитика обучения для HR: завершаемость, просрочки, прогресс по курсам."""
    now = datetime.now(timezone.utc)

    enrollments = (
        db.query(Enrollment)
        .join(User, Enrollment.user_id == User.id)
        .join(Course, Enrollment.course_id == Course.id)
        .all()
    )

    total = len(enrollments)
    completed = 0
    overdue = 0
    in_progress = 0
    deadlines: list[dict] = []
    # course_id -> {title, total, completed}
    per_course: dict[str, dict] = {}

    def _aware(dt: datetime | None) -> datetime | None:
        if dt is None:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    for e in enrollments:
        course = e.course
        bucket = per_course.setdefault(
            e.course_id, {"id": e.course_id, "title": course.title if course else "—", "total": 0, "completed": 0}
        )
        bucket["total"] += 1

        is_done = e.completed_at is not None
        if is_done:
            completed += 1
            bucket["completed"] += 1
            continue

        due = _aware(e.due_date)
        if due is not None and due < now:
            overdue += 1
            days = (now - due).days
            deadlines.append({
                "user_name": e.user.full_name if e.user else "—",
                "course_title": course.title if course else "—",
                "due_date": due.isoformat(),
                "days_overdue": days,
            })
        else:
            in_progress += 1

    completion_rate = round(completed / total * 100) if total else 0

    per_course_list = sorted(per_course.values(), key=lambda c: c["total"], reverse=True)
    deadlines.sort(key=lambda d: d["days_overdue"], reverse=True)

    return {
        "total_enrollments": total,
        "completed": completed,
        "completion_rate": completion_rate,
        "overdue": overdue,
        "in_progress": in_progress,
        "per_course": per_course_list,
        "deadlines": deadlines[:10],
    }


@router.get("/{user_id}/profile")
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id)
        .order_by(Enrollment.assigned_at.desc())
        .all()
    )

    enrollment_data = []
    for enr in enrollments:
        course = db.query(Course).filter(Course.id == enr.course_id).first()
        if not course:
            continue
        _, completed, percent = calculate_course_progress(db, user_id, enr.course_id)
        enrollment_data.append({
            "course_id": enr.course_id,
            "course_title": course.title,
            "assigned_at": enr.assigned_at.isoformat() if enr.assigned_at else None,
            "progress_percent": percent,
            "is_completed": percent == 100,
        })

    certs = (
        db.query(Certificate)
        .filter(Certificate.user_id == user_id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
    cert_data = []
    for c in certs:
        course = db.query(Course).filter(Course.id == c.course_id).first()
        cert_data.append({
            "certificate_number": c.certificate_number,
            "course_title": course.title if course else "—",
            "issued_at": c.issued_at.isoformat() if c.issued_at else None,
            "score": c.score,
        })

    group_name = user.group.name if user.group else None

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "identification_number": user.identification_number,
        "role": user.role,
        "is_active": user.is_active,
        "group_id": user.group_id,
        "group_name": group_name,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "enrollments": enrollment_data,
        "certificates": cert_data,
    }


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("hr")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    return _to_read(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("hr")),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    # Только admin может менять role
    if body.role is not None and current.role != "admin":
        raise HTTPException(status_code=403, detail="Изменение роли доступно только администратору")

    if body.group_id is not None:
        group = db.query(Group).filter(Group.id == body.group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Группа не найдена")

    fields = body.model_dump(exclude_unset=True)
    group_changed = "group_id" in fields and fields["group_id"] != user.group_id
    for field, value in fields.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    # Назначение должности тянет за собой её программу обучения
    # (курсы должности + курсы отдела-предка).
    if group_changed and user.group_id:
        enroll_user_in_group_courses(db, user, assigned_by=current.id)
        db.commit()
        db.refresh(user)

    return _to_read(user)


@router.post("/{user_id}/reset-password", status_code=204)
def reset_user_password(
    user_id: int,
    body: PasswordReset,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    """Сброс пароля пользователю администратором (без email — пароль задаётся вручную)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Пароль должен содержать минимум 6 символов")
    user.hashed_password = hash_password(body.new_password)
    db.commit()
    return None


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles("admin")),
):
    if current.id == user_id:
        raise HTTPException(status_code=400, detail="Нельзя удалить собственный аккаунт")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    db.delete(user)
    db.commit()
    return {"ok": True}
