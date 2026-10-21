from __future__ import annotations
import os
import uuid
import shutil

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Course, Module, Lesson, Block, ModuleTest, Enrollment
from app.models.progress import ModuleTestAttempt, OpenAnswerAttempt
from app.models.certificate import Certificate
from app.models.print_test import PrintTest
from app.schemas.course import CourseCreate, CourseRead, CourseListItem
from app.dependencies import get_current_user, require_role
from app.services.enrollment import student_visible_course_ids
from app.config import get_settings

router = APIRouter(prefix="/courses", tags=["Courses"])
settings = get_settings()


@router.get("/", response_model=list[CourseListItem])
def list_courses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    # Студент видит только опубликованные курсы из своей программы/назначений.
    # HR и admin получают полный список (нужно для конструктора и статистики).
    if user.role == "student":
        visible = student_visible_course_ids(db, user)
        courses = [c for c in courses if c.is_published and c.id in visible]
    result = []
    for c in courses:
        lesson_count = sum(len(m.lessons) for m in c.modules)
        result.append(
            CourseListItem(
                id=c.id,
                title=c.title,
                description=c.description or "",
                is_published=c.is_published,
                cover_image=c.cover_image,
                created_at=c.created_at,
                module_count=len(c.modules),
                lesson_count=lesson_count,
            )
        )
    return result


@router.get("/{course_id}", response_model=CourseRead)
def get_course(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    # Студент может открыть только свой курс (записан / из программы должности).
    # 404 (а не 403), чтобы не раскрывать существование чужих/черновых курсов.
    if user.role == "student" and course.id not in student_visible_course_ids(db, user):
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post("/", response_model=CourseRead, status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("hr")),
):
    if db.query(Course).filter(Course.id == body.id).first():
        raise HTTPException(status_code=400, detail="Course with this ID already exists")

    course = Course(
        id=body.id,
        title=body.title,
        description=body.description,
        sequential=body.sequential,
        require_video=body.require_video,
        created_by=user.id,
    )
    db.add(course)

    for i, mod_data in enumerate(body.modules):
        mod = Module(id=mod_data.id, title=mod_data.title, order=mod_data.order or i, course_id=course.id)
        db.add(mod)
        for j, les_data in enumerate(mod_data.lessons):
            les = Lesson(
                id=les_data.id,
                title=les_data.title,
                type=les_data.type,
                duration=les_data.duration,
                order=les_data.order or j,
                module_id=mod.id,
            )
            db.add(les)
            for k, blk_data in enumerate(les_data.blocks):
                blk = Block(
                    id=blk_data.id,
                    type=blk_data.type,
                    content=blk_data.content,
                    order=blk_data.order or k,
                    lesson_id=les.id,
                )
                db.add(blk)

        for t_idx, test_data in enumerate(getattr(mod_data, "tests", [])):
            test = ModuleTest(
                id=test_data.id,
                module_id=mod.id,
                type=test_data.type,
                title=test_data.title,
                content=test_data.content,
                order=test_data.order if test_data.order is not None else t_idx,
            )
            db.add(test)

    db.commit()
    db.refresh(course)
    return course


@router.put("/{course_id}", response_model=CourseRead)
def update_course(
    course_id: str,
    body: CourseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("hr")),
):
    """Обновляет курс на месте (in-place reconcile).

    Строка Course НЕ удаляется — иначе осиротели бы сертификаты и
    обнулились бы FK (NotNullViolation). Пережившие модули/уроки/блоки/тесты
    правятся по id, удаляются только реально убранные элементы. Так
    сохраняется прогресс студентов по неизменённым урокам.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course.title = body.title
    course.description = body.description
    course.sequential = body.sequential
    course.require_video = body.require_video

    incoming_module_ids = {m.id for m in body.modules}
    existing_modules = {m.id: m for m in course.modules}

    to_delete: list = []            # верхнеуровневые сущности на удаление
    removed_block_ids: list[str] = []
    removed_test_ids: list[str] = []

    # ── Удаляемые модули целиком ──
    for mid, mod in existing_modules.items():
        if mid not in incoming_module_ids:
            for les in mod.lessons:
                removed_block_ids.extend(b.id for b in les.blocks)
            removed_test_ids.extend(t.id for t in mod.tests)
            to_delete.append(mod)

    # ── Обновление / создание модулей ──
    for mi, mod_data in enumerate(body.modules):
        mod = existing_modules.get(mod_data.id)
        if mod is None:
            mod = Module(id=mod_data.id, title=mod_data.title, order=mod_data.order or mi, course_id=course.id)
            db.add(mod)
            existing_lessons = {}
            existing_tests = {}
        else:
            mod.title = mod_data.title
            mod.order = mod_data.order or mi
            existing_lessons = {l.id: l for l in mod.lessons}
            existing_tests = {t.id: t for t in mod.tests}

        # ── Уроки ──
        incoming_lesson_ids = {l.id for l in mod_data.lessons}
        for lid, les in existing_lessons.items():
            if lid not in incoming_lesson_ids:
                removed_block_ids.extend(b.id for b in les.blocks)
                to_delete.append(les)

        for li, les_data in enumerate(mod_data.lessons):
            les = existing_lessons.get(les_data.id)
            if les is None:
                les = Lesson(
                    id=les_data.id, title=les_data.title, type=les_data.type,
                    duration=les_data.duration, order=les_data.order or li, module_id=mod.id,
                )
                db.add(les)
                existing_blocks = {}
            else:
                les.title = les_data.title
                les.type = les_data.type
                les.duration = les_data.duration
                les.order = les_data.order or li
                existing_blocks = {b.id: b for b in les.blocks}

            incoming_block_ids = {b.id for b in les_data.blocks}
            for bid, blk in existing_blocks.items():
                if bid not in incoming_block_ids:
                    removed_block_ids.append(bid)
                    to_delete.append(blk)

            for bi, blk_data in enumerate(les_data.blocks):
                blk = existing_blocks.get(blk_data.id)
                if blk is None:
                    db.add(Block(
                        id=blk_data.id, type=blk_data.type, content=blk_data.content,
                        order=blk_data.order or bi, lesson_id=les.id,
                    ))
                else:
                    blk.type = blk_data.type
                    blk.content = blk_data.content
                    blk.order = blk_data.order or bi

        # ── Тесты ──
        incoming_test_ids = {t.id for t in mod_data.tests}
        for tid, t in existing_tests.items():
            if tid not in incoming_test_ids:
                removed_test_ids.append(tid)
                to_delete.append(t)

        for ti, test_data in enumerate(mod_data.tests):
            t = existing_tests.get(test_data.id)
            if t is None:
                db.add(ModuleTest(
                    id=test_data.id, module_id=mod.id, type=test_data.type,
                    title=test_data.title, content=test_data.content,
                    order=test_data.order if test_data.order is not None else ti,
                ))
            else:
                t.type = test_data.type
                t.title = test_data.title
                t.content = test_data.content
                t.order = test_data.order if test_data.order is not None else ti

    # ── Чистим зависимые попытки, не покрытые каскадом ──
    # (QuizAttempt и LessonProgress удалятся каскадом при удалении блока/урока)
    if removed_block_ids:
        db.query(OpenAnswerAttempt).filter(
            OpenAnswerAttempt.block_id.in_(removed_block_ids)
        ).delete(synchronize_session=False)
    if removed_test_ids:
        db.query(ModuleTestAttempt).filter(
            ModuleTestAttempt.test_id.in_(removed_test_ids)
        ).delete(synchronize_session=False)

    # ── Удаляем убранные сущности (каскад добьёт дочерние) ──
    for obj in to_delete:
        db.delete(obj)

    db.commit()
    db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("hr")),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # ── Чистим зависимые попытки, не покрытые каскадом ──
    # (модули/уроки/блоки/тесты, QuizAttempt и LessonProgress уйдут каскадом)
    module_ids = [m.id for m in db.query(Module.id).filter(Module.course_id == course_id).all()]
    if module_ids:
        test_ids = [t.id for t in db.query(ModuleTest.id).filter(ModuleTest.module_id.in_(module_ids)).all()]
        lesson_ids = [l.id for l in db.query(Lesson.id).filter(Lesson.module_id.in_(module_ids)).all()]
        block_ids = (
            [b.id for b in db.query(Block.id).filter(Block.lesson_id.in_(lesson_ids)).all()]
            if lesson_ids else []
        )
        if test_ids:
            db.query(ModuleTestAttempt).filter(
                ModuleTestAttempt.test_id.in_(test_ids)
            ).delete(synchronize_session=False)
        if block_ids:
            db.query(OpenAnswerAttempt).filter(
                OpenAnswerAttempt.block_id.in_(block_ids)
            ).delete(synchronize_session=False)

    # Сертификаты курса теряют смысл без него — удаляем
    db.query(Certificate).filter(Certificate.course_id == course_id).delete(synchronize_session=False)
    # Печатные тесты самостоятельны — просто отвязываем от курса
    db.query(PrintTest).filter(PrintTest.course_id == course_id).update(
        {PrintTest.course_id: None}, synchronize_session=False
    )

    db.delete(course)
    db.commit()


@router.post("/{course_id}/cover")
def upload_course_cover(
    course_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_role("hr")),
):
    """Upload or replace the cover image for a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    unique_name = f"cover_{course_id}_{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.upload_dir, unique_name)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    course.cover_image = f"/static/{unique_name}"
    db.commit()
    db.refresh(course)

    return {"cover_image": course.cover_image}
