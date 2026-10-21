from __future__ import annotations
import json
import re

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models import (
    User, Block, LessonProgress, QuizAttempt, ModuleTestAttempt,
    OpenAnswerAttempt, VideoProgress, Certificate, Course,
)
from app.models.course import ModuleTest
from app.schemas.progress import CourseProgressRead, LessonProgressRead, QuizSubmit, QuizAttemptRead, ModuleTestSubmit, ModuleTestAttemptRead, TestProgressRead, VideoProgressReport
from app.dependencies import get_current_user, require_role
from app.services.progress import calculate_course_progress
from app.services.certificates import issue_certificate_if_eligible
from app.models import Lesson as LessonModel, Module as ModuleModel
from app.models import Enrollment

router = APIRouter(prefix="/progress", tags=["Progress"])


# ── Грейдинг вопроса любого типа (all-or-nothing) ─────────────────────────────
def _norm(value) -> str:
    """Нормализация короткого ответа: регистр, пробелы, ё→е."""
    return str(value).strip().lower().replace("ё", "е")


def grade_question(q: dict, answer) -> bool:
    """True, если ответ на вопрос верный. Поддерживает все типы вопросов.

    Форматы answer: single/boolean — int; multiple — list[int];
    short — str; ordering — list[int] (порядок исходных индексов).
    Старые вопросы без поля type трактуются как single.
    """
    qtype = q.get("type", "single")

    if qtype == "multiple":
        try:
            chosen = {int(x) for x in (answer or [])}
        except (TypeError, ValueError):
            return False
        correct = {int(x) for x in q.get("correctIndices", [])}
        return bool(correct) and chosen == correct

    if qtype == "short":
        if answer is None:
            return False
        accepted = [a for a in (q.get("correctText") or "").split("|") if a.strip()]
        if not accepted:
            return False
        return _norm(answer) in {_norm(a) for a in accepted}

    if qtype == "ordering":
        try:
            order = [int(x) for x in (answer or [])]
        except (TypeError, ValueError):
            return False
        return order == list(range(len(q.get("options", []))))

    # single / boolean / по умолчанию
    try:
        return int(answer) == int(q.get("correctIndex", -1))
    except (TypeError, ValueError):
        return False


# ── Серверный гейт завершения урока ───────────────────────────────────────────
_VIDEO_EXT_RE = re.compile(r"\.(mp4|webm|ogg)$", re.IGNORECASE)


def _is_playable_video(url: str) -> bool:
    """Совпадает с фронтовым isPlayableVideo: YouTube или прямой видеофайл."""
    if not url:
        return False
    return ("youtu" in url) or bool(_VIDEO_EXT_RE.search(url))


def _ordered_course_items(course: Course) -> list[tuple[str, str]]:
    """Плоский порядок прохождения курса: список (kind, id).

    Совпадает с фронтовым allOrderedItems: сначала обычные модули
    (уроки → тесты), затем итоговый модуль '__root__'.
    """
    normal = [m for m in course.modules if m.title != "__root__"]
    root = next((m for m in course.modules if m.title == "__root__"), None)
    items: list[tuple[str, str]] = []
    for m in normal:
        items += [("lesson", l.id) for l in m.lessons]
        items += [("test", t.id) for t in m.tests]
    if root:
        items += [("lesson", l.id) for l in root.lessons]
        items += [("test", t.id) for t in root.tests]
    return items


def _lesson_completion_blockers(
    db: Session, user_id: int, lesson: LessonModel, course: Course
) -> list[str]:
    """Причины, по которым урок ещё нельзя завершить (пустой список = можно).

    Дублирует на сервере все клиентские гейты, чтобы завершение нельзя
    было подделать прямым запросом к API.
    """
    blockers: list[str] = []

    # 1. Встроенные квизы урока — каждый должен быть сдан (passed)
    for b in lesson.blocks:
        if b.type == "quiz":
            ok = (
                db.query(QuizAttempt)
                .filter(
                    QuizAttempt.user_id == user_id,
                    QuizAttempt.block_id == b.id,
                    QuizAttempt.passed == True,
                )
                .first()
            )
            if not ok:
                blockers.append("Решите правильно все встроенные тесты урока")
                break

    # 2. Открытые ответы — каждый должен быть сдан (ИИ-оценка ≥ порога)
    for b in lesson.blocks:
        if b.type == "open_answer":
            ok = (
                db.query(OpenAnswerAttempt)
                .filter(
                    OpenAnswerAttempt.user_id == user_id,
                    OpenAnswerAttempt.block_id == b.id,
                    OpenAnswerAttempt.passed == True,
                )
                .first()
            )
            if not ok:
                blockers.append("Сдайте все открытые вопросы урока")
                break

    # 3. Видео — досмотрено ≥ 90% (только если включён require_video)
    if course.require_video:
        for b in lesson.blocks:
            if b.type == "video" and _is_playable_video(b.content or ""):
                vp = (
                    db.query(VideoProgress)
                    .filter(
                        VideoProgress.user_id == user_id,
                        VideoProgress.block_id == b.id,
                    )
                    .first()
                )
                if not vp or (vp.watched_ratio or 0) < 90:
                    blockers.append("Досмотрите видео урока до конца")
                    break

    # 4. Последовательное прохождение — все предыдущие элементы пройдены
    if course.sequential:
        items = _ordered_course_items(course)
        idx = next(
            (i for i, (k, _id) in enumerate(items) if k == "lesson" and _id == lesson.id),
            -1,
        )
        for kind, item_id in items[:max(idx, 0)]:
            if kind == "lesson":
                done = (
                    db.query(LessonProgress)
                    .filter(
                        LessonProgress.user_id == user_id,
                        LessonProgress.lesson_id == item_id,
                        LessonProgress.is_completed == True,
                    )
                    .first()
                )
            else:  # test
                done = (
                    db.query(ModuleTestAttempt)
                    .filter(
                        ModuleTestAttempt.user_id == user_id,
                        ModuleTestAttempt.test_id == item_id,
                        ModuleTestAttempt.passed == True,
                    )
                    .first()
                )
            if not done:
                blockers.append("Сначала пройдите предыдущие уроки и тесты по порядку")
                break

    return blockers


@router.post("/video")
def report_video_progress(
    body: VideoProgressReport,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Сохранить достигнутую долю просмотра видео-блока (нарастающим итогом)."""
    block = db.query(Block).filter(Block.id == body.block_id).first()
    if not block or block.type != "video":
        raise HTTPException(status_code=404, detail="Video block not found")

    ratio = max(0, min(100, round(body.ratio * 100)))
    vp = (
        db.query(VideoProgress)
        .filter(VideoProgress.user_id == user.id, VideoProgress.block_id == body.block_id)
        .first()
    )
    if vp:
        if ratio > (vp.watched_ratio or 0):
            vp.watched_ratio = ratio
    else:
        vp = VideoProgress(user_id=user.id, block_id=body.block_id, watched_ratio=ratio)
        db.add(vp)
    db.commit()
    return {"status": "ok", "watched_ratio": vp.watched_ratio}


@router.put("/lessons/{lesson_id}/complete")
def complete_lesson(
    lesson_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    progress = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id == lesson_id)
        .first()
    )
    is_new_completion = not (progress and progress.is_completed)

    # Серверный гейт: проверяем условия завершения только при первом прохождении.
    # Повторный вызов на уже пройденном уроке идемпотентен и не пере-гейтится.
    if is_new_completion:
        lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
        module = db.query(ModuleModel).filter(ModuleModel.id == lesson.module_id).first()
        course = (
            db.query(Course).filter(Course.id == module.course_id).first() if module else None
        )
        if course:
            blockers = _lesson_completion_blockers(db, user.id, lesson, course)
            if blockers:
                raise HTTPException(status_code=409, detail="; ".join(blockers))
    if progress:
        progress.is_completed = True
        progress.completed_at = datetime.now(timezone.utc)
    else:
        progress = LessonProgress(
            user_id=user.id,
            lesson_id=lesson_id,
            is_completed=True,
            completed_at=datetime.now(timezone.utc),
        )
        db.add(progress)

    db.commit()

    # Попытка выдать сертификат (если курс пройден на 100%)
    certificate_number: str | None = None
    new_certificate: bool = False
    course_id: str | None = None

    lesson = db.query(LessonModel).filter(LessonModel.id == lesson_id).first()
    if lesson:
        module = db.query(ModuleModel).filter(ModuleModel.id == lesson.module_id).first()
        if module:
            course_id = module.course_id
            # Проверяем — был ли уже сертификат до этого вызова?
            from app.models import Certificate
            existed_before = (
                db.query(Certificate)
                .filter(
                    Certificate.user_id == user.id,
                    Certificate.course_id == course_id,
                )
                .first()
            )
            cert = issue_certificate_if_eligible(db, user.id, course_id)
            if cert:
                certificate_number = cert.certificate_number
                new_certificate = (existed_before is None) and is_new_completion

    return {
        "status": "ok",
        "course_id": course_id,
        "certificate_number": certificate_number,
        "new_certificate": new_certificate,
    }


@router.get("/courses/{course_id}", response_model=CourseProgressRead)
def get_course_progress(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    total, completed, percent = calculate_course_progress(db, user.id, course_id)

    # Получаем детальный прогресс по урокам
    from app.models import Lesson, Module

    lessons = (
        db.query(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .filter(Module.course_id == course_id)
        .all()
    )
    lesson_ids = [l.id for l in lessons]
    progress_records = (
        db.query(LessonProgress)
        .filter(LessonProgress.user_id == user.id, LessonProgress.lesson_id.in_(lesson_ids))
        .all()
    )
    progress_map = {p.lesson_id: p for p in progress_records}

    lesson_progress = []
    for l in lessons:
        p = progress_map.get(l.id)
        lesson_progress.append(
            LessonProgressRead(
                lesson_id=l.id,
                is_completed=p.is_completed if p else False,
                completed_at=p.completed_at if p else None,
            )
        )

    # Статус тестов курса — для понятного гейта сертификата
    course_tests = (
        db.query(ModuleTest)
        .join(ModuleModel, ModuleTest.module_id == ModuleModel.id)
        .filter(ModuleModel.course_id == course_id)
        .all()
    )
    tests_total = len(course_tests)
    tests_passed = 0
    test_progress: list[TestProgressRead] = []
    for t in course_tests:
        attempts = (
            db.query(ModuleTestAttempt)
            .filter(
                ModuleTestAttempt.user_id == user.id,
                ModuleTestAttempt.test_id == t.id,
            )
            .all()
        )
        passed = any(a.passed for a in attempts)
        best = max((a.score for a in attempts), default=0)
        if passed:
            tests_passed += 1
        test_progress.append(TestProgressRead(test_id=t.id, passed=passed, best_score=best))

    certificate_eligible = (
        total > 0 and percent == 100 and tests_passed == tests_total
    )

    return CourseProgressRead(
        course_id=course_id,
        total_lessons=total,
        completed_lessons=completed,
        progress_percent=percent,
        lessons=lesson_progress,
        tests_total=tests_total,
        tests_passed=tests_passed,
        certificate_eligible=certificate_eligible,
        tests=test_progress,
    )


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


@router.get("/users/{user_id}/courses/{course_id}/detail")
def get_user_course_detail(
    user_id: int,
    course_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("hr")),
):
    """Подробный разбор прохождения курса конкретным студентом (для HR/админа).

    Возвращает структуру курса (модули → уроки/тесты) с наложенным прогрессом:
    статус и время завершения каждого урока, все попытки встроенных квизов,
    открытых ответов с ИИ-оценкой, доля просмотра видео и полная история
    попыток тестов модулей (балл, сдан, нарушения прокторинга, время).
    """
    student = db.query(User).filter(User.id == user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Курс не найден")

    # ── Собираем весь прогресс студента по курсу одним заходом (без N+1) ─────────
    lessons = (
        db.query(LessonModel)
        .join(ModuleModel, LessonModel.module_id == ModuleModel.id)
        .filter(ModuleModel.course_id == course_id)
        .all()
    )
    lesson_ids = {l.id for l in lessons}
    block_ids = {b.id for l in lessons for b in l.blocks}

    lp_map = {
        p.lesson_id: p
        for p in db.query(LessonProgress).filter(
            LessonProgress.user_id == user_id,
            LessonProgress.lesson_id.in_(lesson_ids or {""}),
        )
    }

    quiz_by_block: dict[str, list[QuizAttempt]] = {}
    for a in db.query(QuizAttempt).filter(
        QuizAttempt.user_id == user_id,
        QuizAttempt.block_id.in_(block_ids or {""}),
    ):
        quiz_by_block.setdefault(a.block_id, []).append(a)

    open_by_block: dict[str, list[OpenAnswerAttempt]] = {}
    for a in db.query(OpenAnswerAttempt).filter(
        OpenAnswerAttempt.user_id == user_id,
        OpenAnswerAttempt.block_id.in_(block_ids or {""}),
    ):
        open_by_block.setdefault(a.block_id, []).append(a)

    video_by_block = {
        v.block_id: v
        for v in db.query(VideoProgress).filter(
            VideoProgress.user_id == user_id,
            VideoProgress.block_id.in_(block_ids or {""}),
        )
    }

    course_tests = (
        db.query(ModuleTest)
        .join(ModuleModel, ModuleTest.module_id == ModuleModel.id)
        .filter(ModuleModel.course_id == course_id)
        .all()
    )
    test_ids = {t.id for t in course_tests}
    test_attempts: dict[str, list[ModuleTestAttempt]] = {}
    for a in db.query(ModuleTestAttempt).filter(
        ModuleTestAttempt.user_id == user_id,
        ModuleTestAttempt.test_id.in_(test_ids or {""}),
    ):
        test_attempts.setdefault(a.test_id, []).append(a)

    # Для агрегата «последняя активность» / «начато»
    activity: list = []

    def _track(dt):
        if dt:
            activity.append(dt)

    # ── Строим уроки модуля ──────────────────────────────────────────────────────
    def build_lesson(lesson: LessonModel) -> dict:
        lp = lp_map.get(lesson.id)
        _track(lp.completed_at if lp else None)

        quizzes, open_answers, videos = [], [], []
        for b in sorted(lesson.blocks, key=lambda x: x.order):
            if b.type == "quiz":
                atts = quiz_by_block.get(b.id, [])
                for a in atts:
                    _track(a.attempted_at)
                last = max(atts, key=lambda a: a.attempted_at or datetime.min.replace(tzinfo=timezone.utc), default=None) if atts else None
                quizzes.append({
                    "block_id": b.id,
                    "attempts_count": len(atts),
                    "passed": any(a.passed for a in atts),
                    "best_score": max((a.score for a in atts), default=0),
                    "last_attempt_at": _iso(last.attempted_at) if last else None,
                })
            elif b.type == "open_answer":
                atts = open_by_block.get(b.id, [])
                for a in atts:
                    _track(a.attempted_at)
                last = max(atts, key=lambda a: a.attempted_at or datetime.min.replace(tzinfo=timezone.utc), default=None) if atts else None
                open_answers.append({
                    "block_id": b.id,
                    "attempts_count": len(atts),
                    "passed": any(a.passed for a in atts),
                    "best_score": max((a.score for a in atts), default=0),
                    "last_answer": (last.answer if last else None),
                    "last_feedback": (last.feedback if last else None),
                    "last_attempt_at": _iso(last.attempted_at) if last else None,
                })
            elif b.type == "video" and _is_playable_video(b.content or ""):
                v = video_by_block.get(b.id)
                videos.append({
                    "block_id": b.id,
                    "watched_ratio": (v.watched_ratio if v else 0),
                })

        return {
            "kind": "lesson",
            "id": lesson.id,
            "title": lesson.title,
            "type": lesson.type,
            "duration": lesson.duration,
            "is_completed": bool(lp and lp.is_completed),
            "completed_at": _iso(lp.completed_at) if lp else None,
            "quizzes": quizzes,
            "open_answers": open_answers,
            "videos": videos,
        }

    def build_test(test: ModuleTest) -> dict:
        atts = sorted(
            test_attempts.get(test.id, []),
            key=lambda a: a.attempted_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        for a in atts:
            _track(a.attempted_at)
        try:
            threshold = json.loads(test.content or "{}").get("pass_threshold", 70)
        except (json.JSONDecodeError, TypeError):
            threshold = 70
        return {
            "kind": "test",
            "id": test.id,
            "title": test.title or "Тест модуля",
            "pass_threshold": threshold,
            "passed": any(a.passed for a in atts),
            "best_score": max((a.score for a in atts), default=0),
            "attempts_count": len(atts),
            "max_focus_violations": max((a.focus_violations for a in atts), default=0),
            "attempts": [
                {
                    "score": a.score,
                    "passed": a.passed,
                    "focus_violations": a.focus_violations,
                    "attempted_at": _iso(a.attempted_at),
                }
                for a in atts
            ],
        }

    # Порядок модулей: обычные (по order), затем итоговый __root__
    normal = [m for m in course.modules if m.title != "__root__"]
    root = next((m for m in course.modules if m.title == "__root__"), None)
    ordered_modules = normal + ([root] if root else [])

    modules_out = []
    for m in ordered_modules:
        items = [build_lesson(l) for l in sorted(m.lessons, key=lambda x: x.order)]
        items += [build_test(t) for t in sorted(m.tests, key=lambda x: x.order)]
        modules_out.append({
            "id": m.id,
            "title": "Итоговый раздел" if m.title == "__root__" else m.title,
            "is_final": m.title == "__root__",
            "items": items,
        })

    # ── Сводка ───────────────────────────────────────────────────────────────────
    total, completed, percent = calculate_course_progress(db, user_id, course_id)
    tests_total = len(course_tests)
    tests_passed = sum(
        1 for t in course_tests if any(a.passed for a in test_attempts.get(t.id, []))
    )
    certificate_eligible = total > 0 and percent == 100 and tests_passed == tests_total

    enr = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    cert = (
        db.query(Certificate)
        .filter(Certificate.user_id == user_id, Certificate.course_id == course_id)
        .first()
    )

    return {
        "user": {
            "id": student.id,
            "full_name": student.full_name,
            "email": student.email,
            "group_name": student.group.name if student.group else None,
        },
        "course": {
            "id": course.id,
            "title": course.title,
            "sequential": course.sequential,
            "require_video": course.require_video,
        },
        "summary": {
            "total_lessons": total,
            "completed_lessons": completed,
            "progress_percent": percent,
            "tests_total": tests_total,
            "tests_passed": tests_passed,
            "certificate_eligible": certificate_eligible,
            "is_enrolled": enr is not None,
            "assigned_at": _iso(enr.assigned_at) if enr else None,
            "due_date": _iso(enr.due_date) if enr else None,
            "completed_at": _iso(enr.completed_at) if enr else None,
            "started_at": _iso(min(activity)) if activity else None,
            "last_activity_at": _iso(max(activity)) if activity else None,
            "certificate": (
                {
                    "certificate_number": cert.certificate_number,
                    "issued_at": _iso(cert.issued_at),
                    "score": cert.score,
                }
                if cert else None
            ),
        },
        "modules": modules_out,
    }


@router.post("/quiz", response_model=QuizAttemptRead)
def submit_quiz(
    body: QuizSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    block = db.query(Block).filter(Block.id == body.block_id).first()
    if not block or block.type != "quiz":
        raise HTTPException(status_code=404, detail="Quiz block not found")

    # Парсим контент блока для проверки ответов
    try:
        quiz_data = json.loads(block.content)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid quiz data in block")

    correct_index = quiz_data.get("correctIndex", 0)
    # answers — dict вида {"0": selectedIndex}
    selected = body.answers.get("0", body.answers.get(0, -1))
    is_correct = selected == correct_index
    score = 100 if is_correct else 0

    attempt = QuizAttempt(
        user_id=user.id,
        lesson_id=body.lesson_id,
        block_id=body.block_id,
        answers=body.answers,
        score=score,
        passed=is_correct,
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


@router.get("/quiz/{lesson_id}", response_model=list[QuizAttemptRead])
def get_quiz_attempts(
    lesson_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user.id, QuizAttempt.lesson_id == lesson_id)
        .order_by(QuizAttempt.attempted_at.desc())
        .all()
    )


@router.post("/module-test", response_model=ModuleTestAttemptRead)
def submit_module_test(
    body: ModuleTestSubmit,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Принять ответы студента на тест модуля, посчитать результат."""
    test = db.query(ModuleTest).filter(ModuleTest.id == body.test_id).first()
    if not test:
        raise HTTPException(status_code=404, detail="Module test not found")

    try:
        test_data = json.loads(test.content)
    except (json.JSONDecodeError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid test data")

    questions = test_data.get("questions", [])
    pass_threshold = test_data.get("pass_threshold", 70)

    # Банк вопросов: если переданы question_ids (показанная студенту выборка) —
    # считаем балл только по ним, иначе по всем вопросам теста.
    if body.question_ids:
        served = set(body.question_ids)
        graded = [q for q in questions if q.get("id") in served]
    else:
        graded = questions

    if not graded:
        score = 100
    else:
        correct = sum(1 for q in graded if grade_question(q, body.answers.get(q["id"])))
        score = round(correct / len(graded) * 100)

    passed = score >= pass_threshold

    attempt = ModuleTestAttempt(
        user_id=user.id,
        test_id=body.test_id,
        answers=body.answers,
        score=score,
        passed=passed,
        focus_violations=max(0, body.focus_violations),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    # Если тест пройден — проверяем, не получил ли студент теперь право на сертификат
    new_certificate = False
    certificate_number = None
    if passed:
        module = db.query(ModuleModel).filter(ModuleModel.id == test.module_id).first()
        if module:
            existed = (
                db.query(Certificate)
                .filter(Certificate.user_id == user.id, Certificate.course_id == module.course_id)
                .first()
            )
            cert = issue_certificate_if_eligible(db, user.id, module.course_id)
            if cert and not existed:
                new_certificate = True
                certificate_number = cert.certificate_number

    return ModuleTestAttemptRead(
        id=attempt.id,
        test_id=attempt.test_id,
        answers=attempt.answers,
        score=attempt.score,
        passed=attempt.passed,
        focus_violations=attempt.focus_violations,
        attempted_at=attempt.attempted_at,
        new_certificate=new_certificate,
        certificate_number=certificate_number,
    )


@router.get("/module-test/{test_id}/attempts", response_model=list[ModuleTestAttemptRead])
def get_all_module_test_attempts(
    test_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Все попытки студента по данному тесту (от новых к старым)."""
    return (
        db.query(ModuleTestAttempt)
        .filter(ModuleTestAttempt.user_id == user.id, ModuleTestAttempt.test_id == test_id)
        .order_by(ModuleTestAttempt.attempted_at.desc())
        .all()
    )


@router.get("/module-test/{test_id}", response_model=Optional[ModuleTestAttemptRead])
def get_module_test_attempt(
    test_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Последняя попытка студента по данному тесту (или null)."""
    return (
        db.query(ModuleTestAttempt)
        .filter(ModuleTestAttempt.user_id == user.id, ModuleTestAttempt.test_id == test_id)
        .order_by(ModuleTestAttempt.attempted_at.desc())
        .first()
    )
