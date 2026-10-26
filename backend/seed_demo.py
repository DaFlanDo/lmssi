"""
Демо-данные: IT-компания «НордБайт» — отделы и должности, сотрудники,
пять курсов (см. seed_courses.py), программы обучения по должностям,
прогресс, результаты тестов и сертификаты.

Запуск: python seed_demo.py  (после create_admin.py)
Если демо-курсы уже есть, ничего не делает — полный сброс делает reset_demo.py.
"""
import os
import random
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
import app.models  # noqa: F401 — регистрирует все модели

from app.db_migrate import run_migrations
run_migrations()

from app.config import get_settings
from app.models.certificate import Certificate
from app.models.course import Course, Lesson, Module
from app.models.enrollment import Enrollment
from app.models.progress import LessonProgress, ModuleTestAttempt
from app.models.user import User
from app.services.auth import hash_password
from app.services.enrollment import enroll_user_in_group_courses
from scripts.add_course_covers import build_svg
from seed_courses import COURSES, DOCKER, GIT, ONBOARDING, PYTHON, SECURITY
from seed_kit import bind_courses, get_or_create_group, insert_course
from seed_svgs import SVGS

random.seed(7)  # одинаковые демо-данные при каждом сбросе
db = SessionLocal()
upload_dir = get_settings().upload_dir
os.makedirs(upload_dir, exist_ok=True)


def days(n: float) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=n)


if db.query(Course).filter(Course.id == ONBOARDING["id"]).first():
    print("Демо-данные уже загружены — пропускаю (полный сброс: python reset_demo.py)")
    sys.exit(0)

# ─── 1. Схемы для уроков и курсы ─────────────────────────────────────────────

for name, svg in SVGS.items():
    with open(os.path.join(upload_dir, name), "w", encoding="utf-8") as f:
        f.write(svg)

admin = db.query(User).filter(User.role == "admin").first()
for data in COURSES:
    cover = f'cover_{data["id"]}.svg'
    with open(os.path.join(upload_dir, cover), "w", encoding="utf-8") as f:
        f.write(build_svg(data["title"]))
    insert_course(db, data, admin.id if admin else None, f"/static/{cover}")
print(f"✓ Курсы: {len(COURSES)}")

# ─── 2. Отделы, должности и программы обучения ───────────────────────────────
# Курсы отдела получают все его должности, курсы должности — только она.

BASE = [ONBOARDING["id"], SECURITY["id"]]
STRUCTURE = [
    ("Разработка", "Продуктовые команды: бэкенд, фронтенд, мобильная разработка",
     BASE + [GIT["id"], DOCKER["id"]],
     {"Backend-разработчик": [PYTHON["id"]], "Frontend-разработчик": [], "Mobile-разработчик": []}),
    ("Качество (QA)", "Ручное и автоматизированное тестирование",
     BASE + [GIT["id"]], {"QA-инженер": []}),
    ("DevOps и инфраструктура", "Платформенная команда: CI/CD, Kubernetes, мониторинг",
     BASE + [GIT["id"], DOCKER["id"]], {"DevOps-инженер": []}),
    ("Продукт и дизайн", "Продакт-менеджеры и дизайнеры",
     BASE, {"Продакт-менеджер": [], "UX/UI-дизайнер": []}),
    ("HR и офис", "Подбор, адаптация и офис",
     BASE, {"HR-менеджер": [], "Офис-менеджер": []}),
]

positions = {}
for dept_name, description, dept_courses, dept_positions in STRUCTURE:
    dept = get_or_create_group(db, dept_name, description=description)
    bind_courses(db, dept, dept_courses)
    for pos_name, pos_courses in dept_positions.items():
        positions[pos_name] = get_or_create_group(db, pos_name, parent_id=dept.id)
        bind_courses(db, positions[pos_name], pos_courses)
print(f"✓ Отделы и должности: {len(STRUCTURE)} / {len(positions)}")

# ─── 3. Сотрудники ───────────────────────────────────────────────────────────

hr = User(email="hr@nordbyte.dev", full_name="Анна Ковалёва", hashed_password=hash_password("hr123"),
          role="hr", identification_number="3010294A001PB1", group_id=positions["HR-менеджер"].id)
db.add(hr)
db.commit()

# Демо-сотрудник (кнопка «Сотрудник» на странице входа): junior-бэкендер.
# Онбординг пройден (есть сертификат), Python-курс и безопасность — наполовину,
# Git и Docker впереди: посетитель видит и историю, и что проходить дальше
DEMO_STUDENT = ("Алексей Сидоров", "a.sidorov@nordbyte.dev", "Backend-разработчик")
STUDENTS = [
    DEMO_STUDENT,
    ("Екатерина Волкова", "e.volkova@nordbyte.dev", "Frontend-разработчик"),
    ("Дмитрий Новиков", "d.novikov@nordbyte.dev", "Backend-разработчик"),
    ("Максим Ершов", "m.ershov@nordbyte.dev", "Backend-разработчик"),
    ("Мария Ким", "m.kim@nordbyte.dev", "Frontend-разработчик"),
    ("Наталья Зуева", "n.zueva@nordbyte.dev", "Mobile-разработчик"),
    ("Ольга Морозова", "o.morozova@nordbyte.dev", "QA-инженер"),
    ("Игорь Белов", "i.belov@nordbyte.dev", "DevOps-инженер"),
    ("Павел Орлов", "p.orlov@nordbyte.dev", "Продакт-менеджер"),
    ("Светлана Захарова", "s.zakharova@nordbyte.dev", "UX/UI-дизайнер"),
    ("Кирилл Лебедев", "k.lebedev@nordbyte.dev", "Офис-менеджер"),
]

students = []
for i, (name, email, position) in enumerate(STUDENTS):
    user = User(email=email, full_name=name, hashed_password=hash_password("student123"), role="student",
                identification_number=f"3{i:02d}0395B0{i:02d}PB1", group_id=positions[position].id)
    db.add(user)
    db.commit()
    db.refresh(user)
    enroll_user_in_group_courses(db, user, assigned_by=hr.id)  # программа должности
    db.commit()
    students.append(user)
print(f"✓ Сотрудники: {len(students)} + HR")

# ─── 4. Прогресс, тесты и сертификаты ────────────────────────────────────────

course_parts = {}
for data in COURSES:
    mods = (db.query(Module).filter(Module.course_id == data["id"], Module.title != "__root__")
            .order_by(Module.order).all())
    root = db.query(Module).filter(Module.course_id == data["id"], Module.title == "__root__").first()
    course_parts[data["id"]] = {
        "modules": [(m, sorted(m.lessons, key=lambda les: les.order), list(m.tests)) for m in mods],
        "final": list(root.tests) if root else [],
    }

cert_counter = 0


def complete_modules(user: User, course_id: str, count: int, when: datetime) -> list[int]:
    """Пройденные уроки и сданные тесты первых `count` модулей. Возвращает баллы."""
    scores = []
    for _module, lessons, tests in course_parts[course_id]["modules"][:count]:
        for les in lessons:
            db.add(LessonProgress(user_id=user.id, lesson_id=les.id, is_completed=True,
                                  completed_at=when + timedelta(hours=random.randint(1, 30))))
        for t in tests:
            score = random.choice([75, 80, 83, 88, 92, 100])
            scores.append(score)
            db.add(ModuleTestAttempt(user_id=user.id, test_id=t.id, answers={}, score=score, passed=True,
                                     attempted_at=when + timedelta(hours=random.randint(2, 40))))
    return scores


def finish_course(user: User, enrollment: Enrollment, when: datetime) -> None:
    global cert_counter
    cid = enrollment.course_id
    scores = complete_modules(user, cid, len(course_parts[cid]["modules"]), when)
    for t in course_parts[cid]["final"]:
        score = random.choice([82, 86, 90, 95])
        scores.append(score)
        db.add(ModuleTestAttempt(user_id=user.id, test_id=t.id, answers={}, score=score, passed=True,
                                 attempted_at=when + timedelta(days=1)))
    enrollment.completed_at = when + timedelta(days=1, hours=2)
    cert_counter += 1
    db.add(Certificate(certificate_number=f"NBT-2026-{cert_counter:06d}", user_id=user.id, course_id=cid,
                       issued_at=enrollment.completed_at, score=round(sum(scores) / len(scores))))


demo_user = students[0]
for user in students:
    enrollments = (db.query(Enrollment).filter(Enrollment.user_id == user.id)
                   .order_by(Enrollment.id).all())
    for idx, enrollment in enumerate(enrollments):
        cid = enrollment.course_id
        enrollment.assigned_at = days(-random.randint(25, 60))
        enrollment.due_date = days(random.randint(7, 45))
        start = enrollment.assigned_at + timedelta(days=random.randint(1, 5))

        if user is demo_user:
            if cid == ONBOARDING["id"]:
                finish_course(user, enrollment, start)
            elif cid in (SECURITY["id"], PYTHON["id"]):
                complete_modules(user, cid, 1, start)
                if cid == SECURITY["id"]:
                    enrollment.due_date = days(5)  # скоро дедлайн — видно на дашборде
            continue

        # Остальные: обязательные курсы чаще пройдены, профильные — в процессе
        roll = random.random()
        if (idx < 2 and roll < 0.8) or roll < 0.35:
            finish_course(user, enrollment, start)
        elif roll < 0.75:
            complete_modules(user, cid, 1, start)
        if enrollment.completed_at is None and roll > 0.9:
            enrollment.due_date = days(-random.randint(2, 6))  # просрочено — для аналитики HR

db.commit()

print(f"✓ Сертификатов: {db.query(Certificate).count()}, "
      f"сданных тестов: {db.query(ModuleTestAttempt).count()}, "
      f"пройденных уроков: {db.query(LessonProgress).count()}")
print(f"\nДемо-данные загружены: {len(COURSES)} курсов, {db.query(Lesson).count()} уроков, "
      f"{len(students)} сотрудников")
print("Вход: admin@nordbyte.dev / admin123 · hr@nordbyte.dev / hr123 · a.sidorov@nordbyte.dev / student123")
db.close()
