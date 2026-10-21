from __future__ import annotations
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Course, Enrollment, Module, Lesson, LessonProgress, Group
from app.schemas.enrollment import EnrollmentCreate, EnrollmentRead, UserEnrollmentDetail, GroupEnrollmentCreate, GroupEnrollmentResult
from app.dependencies import get_current_user, require_role
from app.services.progress import calculate_course_progress
from app.services.enrollment import enroll_user_in_course, enroll_user_in_group_courses
from app.services.reminders import generate_due_reminders

router = APIRouter(prefix="/enrollments", tags=["Enrollments"])


@router.post("/", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def enroll_user(
    body: EnrollmentCreate,
    db: Session = Depends(get_db),
    hr: User = Depends(require_role("hr")),
):
    # Проверяем что курс и пользователь существуют
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not db.query(User).filter(User.id == body.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    created = enroll_user_in_course(
        db, body.user_id, course, assigned_by=hr.id, due_date=body.due_date
    )
    if not created:
        raise HTTPException(status_code=400, detail="User already enrolled")

    db.commit()
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == body.user_id, Enrollment.course_id == body.course_id)
        .first()
    )
    return enrollment


@router.get("/my", response_model=list[EnrollmentRead])
def my_enrollments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Самовосстановление: гарантируем запись на программу должности (курсы
    # должности + курсы её отдела). Идемпотентно — дубликаты пропускаются;
    # новые курсы, добавленные HR к отделу/должности, подхватятся автоматически.
    if enroll_user_in_group_courses(db, user) > 0:
        db.commit()
    # Лениво создаём напоминания о приближающихся/просроченных сроках
    generate_due_reminders(db, user)
    return (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id)
        .order_by(Enrollment.assigned_at.desc())
        .all()
    )


@router.get("/course/{course_id}", response_model=list[EnrollmentRead])
def course_enrollments(
    course_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    return (
        db.query(Enrollment)
        .filter(Enrollment.course_id == course_id)
        .order_by(Enrollment.assigned_at.desc())
        .all()
    )


@router.get("/user/{user_id}", response_model=list[UserEnrollmentDetail])
def user_enrollments(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    """Список курсов пользователя с прогрессом по каждому."""
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    enrollments = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id)
        .order_by(Enrollment.assigned_at.desc())
        .all()
    )

    result: list[UserEnrollmentDetail] = []
    for e in enrollments:
        if not e.course:
            continue
        total, completed, percent = calculate_course_progress(db, user_id, e.course_id)
        result.append(UserEnrollmentDetail(
            enrollment_id=e.id,
            course_id=e.course_id,
            course_title=e.course.title,
            course_description=e.course.description or "",
            assigned_at=e.assigned_at,
            completed_at=e.completed_at,
            due_date=e.due_date,
            total_lessons=total,
            completed_lessons=completed,
            progress_percent=percent,
        ))
    return result


@router.post("/group", response_model=GroupEnrollmentResult, status_code=status.HTTP_201_CREATED)
def enroll_group(
    body: GroupEnrollmentCreate,
    db: Session = Depends(get_db),
    hr: User = Depends(require_role("hr")),
):
    """Назначить курс всем пользователям отдела (группы)."""
    course = db.query(Course).filter(Course.id == body.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    group = db.query(Group).filter(Group.id == body.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    users = db.query(User).filter(User.group_id == body.group_id).all()
    enrolled = 0
    skipped = 0
    for user in users:
        if enroll_user_in_course(db, user.id, course, assigned_by=hr.id, due_date=body.due_date):
            enrolled += 1
        else:
            skipped += 1

    db.commit()
    return GroupEnrollmentResult(enrolled=enrolled, skipped=skipped)


@router.get("/report")
def download_report(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    """CSV-отчёт по всем назначениям курсов для HR."""
    enrollments = (
        db.query(Enrollment)
        .order_by(Enrollment.assigned_at.desc())
        .all()
    )

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";")
    writer.writerow(["ФИО", "Email", "Курс", "Прогресс %", "Назначен", "Срок сдачи", "Завершён", "Статус"])

    for e in enrollments:
        if not e.user or not e.course:
            continue
        _, __, percent = calculate_course_progress(db, e.user_id, e.course_id)
        status_str = "Завершён" if percent == 100 else "В процессе"
        writer.writerow([
            e.user.full_name,
            e.user.email,
            e.course.title,
            percent,
            e.assigned_at.strftime("%d.%m.%Y") if e.assigned_at else "",
            e.due_date.strftime("%d.%m.%Y") if e.due_date else "",
            e.completed_at.strftime("%d.%m.%Y") if e.completed_at else "",
            status_str,
        ])

    content = "﻿" + buf.getvalue()  # BOM для Excel
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8-sig",
        headers={"Content-Disposition": 'attachment; filename="lms_report.csv"'},
    )


@router.delete("/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    """Отозвать назначение курса."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    db.delete(enrollment)
    db.commit()
    return None
