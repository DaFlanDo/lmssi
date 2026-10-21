from sqlalchemy.orm import Session

from app.models import Lesson, LessonProgress


def calculate_course_progress(db: Session, user_id: int, course_id: str) -> tuple[int, int, int]:
    """Returns (total_lessons, completed_lessons, progress_percent)."""
    # Все уроки курса через join Module → Lesson
    from app.models import Module

    lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course_id)
        .all()
    )
    total = len(lessons)
    if total == 0:
        return 0, 0, 0

    lesson_ids = [l.id for l in lessons]
    completed = (
        db.query(LessonProgress)
        .filter(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(lesson_ids),
            LessonProgress.is_completed == True,
        )
        .count()
    )
    percent = round(completed / total * 100)
    return total, completed, percent
