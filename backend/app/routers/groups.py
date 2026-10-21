from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Group, User, Course
from app.models.group import group_course
from app.schemas.group import (
    GroupCreate,
    GroupRead,
    CourseShort,
    GroupCourseAttach,
    GroupCoursesReorder,
)
from app.dependencies import get_current_user, require_roles, require_role
from app.services.progress import calculate_course_progress
from app.services.enrollment import _group_program_courses

router = APIRouter(prefix="/groups", tags=["Groups"])


def _to_read(group: Group, db: Session) -> GroupRead:
    user_count = db.query(User).filter(User.group_id == group.id).count()
    courses = [CourseShort.model_validate(c) for c in group.courses]
    return GroupRead(
        id=group.id,
        name=group.name,
        description=group.description,
        parent_id=group.parent_id,
        user_count=user_count,
        courses=courses,
        course_count=len(courses),
    )


@router.get("/", response_model=list[GroupRead])
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(Group).order_by(Group.parent_id.nullsfirst(), Group.name).all()
    return [_to_read(g, db) for g in groups]


@router.get("/my")
def my_program(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Программа обучения текущего пользователя по его должности.

    Возвращает группу (должность) и её курсы + курсы отделов-предков с
    прогрессом по каждому. Если должность не назначена — group будет null.
    """
    if not user.group_id or not user.group:
        return {"group": None, "courses": []}

    courses = []
    for course in _group_program_courses(user.group):
        total, completed, percent = calculate_course_progress(db, user.id, course.id)
        courses.append({
            "id": course.id,
            "title": course.title,
            "description": course.description or "",
            "cover_image": course.cover_image,
            "total_lessons": total,
            "completed_lessons": completed,
            "progress_percent": percent,
        })

    return {
        "group": {"id": user.group.id, "name": user.group.name},
        "courses": courses,
    }


@router.post("/", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(
    body: GroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    if body.parent_id:
        parent = db.query(Group).filter(Group.id == body.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Родительская группа не найдена")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="Нельзя создать группу третьего уровня")

    group = Group(name=body.name, description=body.description, parent_id=body.parent_id)
    db.add(group)
    db.commit()
    db.refresh(group)
    return _to_read(group, db)


@router.patch("/{group_id}", response_model=GroupRead)
def update_group(
    group_id: int,
    body: GroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    if body.name is not None:
        group.name = body.name
    if body.description is not None:
        group.description = body.description

    db.commit()
    db.refresh(group)
    return _to_read(group, db)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    user_count = db.query(User).filter(User.group_id == group_id).count()
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Невозможно удалить: в группе {user_count} сотрудников",
        )

    children_count = db.query(Group).filter(Group.parent_id == group_id).count()
    if children_count > 0:
        raise HTTPException(
            status_code=400,
            detail="Сначала удалите дочерние группы",
        )

    db.delete(group)
    db.commit()


# ─── Траектория курсов группы (отдел/должность) ──────────────────────────────

@router.post("/{group_id}/courses", response_model=GroupRead)
def attach_course(
    group_id: int,
    body: GroupCourseAttach,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")

    existing = db.execute(
        select(group_course).where(
            group_course.c.group_id == group_id,
            group_course.c.course_id == body.course_id,
        )
    ).fetchone()

    if not existing:
        count = db.execute(
            select(func.count()).select_from(group_course).where(
                group_course.c.group_id == group_id
            )
        ).scalar() or 0

        db.execute(
            group_course.insert().values(
                group_id=group_id,
                course_id=body.course_id,
                order=count,
            )
        )
        db.commit()

    db.refresh(group)
    return _to_read(group, db)


@router.put("/{group_id}/courses/reorder", response_model=GroupRead)
def reorder_courses(
    group_id: int,
    body: GroupCoursesReorder,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    for i, course_id in enumerate(body.course_ids):
        db.execute(
            update(group_course)
            .where(
                group_course.c.group_id == group_id,
                group_course.c.course_id == course_id,
            )
            .values(order=i)
        )
    db.commit()
    db.refresh(group)
    return _to_read(group, db)


@router.delete("/{group_id}/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def detach_course(
    group_id: int,
    course_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")
    group.courses = [c for c in group.courses if c.id != course_id]
    db.commit()
    return None
