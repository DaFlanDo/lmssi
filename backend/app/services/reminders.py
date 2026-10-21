from __future__ import annotations
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Course, Enrollment, User
from app.models.notification import Notification
from app.services.progress import calculate_course_progress

# За сколько дней до срока показывать напоминание «скоро дедлайн»
DUE_SOON_DAYS = 3
# Не создавать повторное напоминание того же типа по тому же курсу чаще, чем раз в сутки
DEDUP_WINDOW = timedelta(days=1)


def generate_due_reminders(db: Session, user: User) -> int:
    """Создать напоминания о приближающихся и просроченных сроках курсов.

    Проходит по незавершённым назначениям пользователя со сроком сдачи и
    создаёт уведомления `course_due_soon` / `course_overdue`. Чтобы не
    спамить, повторное уведомление того же типа по тому же курсу не
    создаётся, если такое уже было за последние сутки. Возвращает число
    созданных уведомлений. Вызывается лениво — при загрузке дашборда.
    """
    now = datetime.now(timezone.utc)
    soon = now + timedelta(days=DUE_SOON_DAYS)
    recent_cutoff = now - DEDUP_WINDOW

    enrollments = (
        db.query(Enrollment)
        .filter(
            Enrollment.user_id == user.id,
            Enrollment.due_date.isnot(None),
            Enrollment.completed_at.is_(None),
        )
        .all()
    )

    created = 0
    for e in enrollments:
        # Курс мог быть пройден без проставленного completed_at — проверяем прогресс
        _, _, percent = calculate_course_progress(db, user.id, e.course_id)
        if percent >= 100:
            continue

        due = e.due_date
        if due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)

        if due < now:
            ntype = "course_overdue"
        elif due <= soon:
            ntype = "course_due_soon"
        else:
            continue

        already = (
            db.query(Notification)
            .filter(
                Notification.user_id == user.id,
                Notification.type == ntype,
                Notification.related_course_id == e.course_id,
                Notification.created_at >= recent_cutoff,
            )
            .first()
        )
        if already:
            continue

        course = e.course or db.query(Course).filter(Course.id == e.course_id).first()
        title = course.title if course else "курс"
        due_str = due.strftime("%d.%m.%Y")

        if ntype == "course_overdue":
            notification = Notification(
                user_id=user.id,
                type=ntype,
                title="Просрочен срок курса",
                message=f"Срок прохождения курса «{title}» истёк ({due_str}). Пожалуйста, завершите обучение.",
                related_course_id=e.course_id,
            )
        else:
            notification = Notification(
                user_id=user.id,
                type=ntype,
                title="Приближается срок курса",
                message=f"До завершения курса «{title}» осталось мало времени — срок {due_str}.",
                related_course_id=e.course_id,
            )
        db.add(notification)
        created += 1

    if created:
        db.commit()
    return created
