from __future__ import annotations
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from app.models import Course, Enrollment, User
from app.models.notification import Notification


def enroll_user_in_course(
    db: Session,
    user_id: int,
    course: Course,
    assigned_by: Optional[int] = None,
    due_date: Optional[datetime] = None,
) -> bool:
    """Назначить курс пользователю и создать уведомление.

    Возвращает True, если назначение создано, и False, если пользователь
    уже записан на курс (дубликат пропускается). Объекты добавляются в
    сессию, но commit остаётся на стороне вызывающего кода.
    """
    existing = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course.id)
        .first()
    )
    if existing:
        return False

    db.add(Enrollment(
        user_id=user_id,
        course_id=course.id,
        assigned_by=assigned_by,
        due_date=due_date,
    ))
    due_str = f" Срок: {due_date.strftime('%d.%m.%Y')}." if due_date else ""
    db.add(Notification(
        user_id=user_id,
        type="course_assigned",
        title="Вам назначен новый курс",
        message=f"Курс «{course.title}» добавлен в вашу программу обучения.{due_str}",
        related_course_id=course.id,
    ))
    return True


def _group_program_courses(group) -> list:
    """Курсы программы обучения для группы: курсы самой группы + всех её
    предков по иерархии (отдел → должность). Курсы должности идут первыми,
    затем курсы вышестоящих отделов. Дубликаты по id убираются.
    """
    ordered: list = []
    seen: set = set()
    node = group
    while node is not None:
        for course in node.courses:
            if course.id not in seen:
                seen.add(course.id)
                ordered.append(course)
        node = node.parent
    return ordered


def student_visible_course_ids(db: Session, user: User) -> set[str]:
    """Курсы, доступные студенту: на которые он записан + программа его
    должности/отдела. Чужие курсы студент не видит.
    """
    from app.models import Enrollment

    ids = {
        row.course_id
        for row in db.query(Enrollment.course_id)
        .filter(Enrollment.user_id == user.id)
        .all()
    }
    if user.group is not None:
        for course in _group_program_courses(user.group):
            ids.add(course.id)
    return ids


def enroll_user_in_group_courses(
    db: Session,
    user: User,
    assigned_by: Optional[int] = None,
) -> int:
    """Назначить сотруднику все курсы его группы и её отделов-предков.

    Сотрудник получает курсы своей должности + универсальные курсы отдела,
    к которому относится должность. Возвращает число реально созданных
    назначений (дубликаты пропускаются). Commit — на стороне вызывающего кода.
    """
    if not user.group_id or not user.group:
        return 0

    enrolled = 0
    for course in _group_program_courses(user.group):
        if enroll_user_in_course(db, user.id, course, assigned_by=assigned_by):
            enrolled += 1
    return enrolled
