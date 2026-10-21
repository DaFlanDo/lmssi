"""
Общие фикстуры. Каждый тест получает чистую SQLite-базу во временном каталоге,
схема создаётся теми же миграциями Alembic, что и в проде.
"""
from __future__ import annotations

import os
import sys
import tempfile
import uuid

# Окружение задаётся до импорта app.* — настройки и engine создаются при импорте
_TMP = tempfile.mkdtemp(prefix="lmssi-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["UPLOAD_DIR"] = os.path.join(_TMP, "uploads")
os.environ["OPENAI_API_KEY"] = ""
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import Base, SessionLocal, engine
from app.models import Course, Group, Lesson, Module, Block, User
from app.services.auth import hash_password, create_access_token


@pytest.fixture(autouse=True)
def _clean_db():
    yield
    # Чистим данные, а не схему: таблицы и alembic_version остаются
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_user(db):
    def _make(role: str = "student", password: str = "secret123", group: Group | None = None, **kw) -> User:
        n = uuid.uuid4().hex[:8]
        user = User(
            email=kw.get("email", f"{role}-{n}@example.com"),
            identification_number=kw.get("identification_number", n.upper()),
            full_name=kw.get("full_name", f"{role.title()} {n}"),
            hashed_password=hash_password(password),
            role=role,
            is_active=kw.get("is_active", True),
            group_id=group.id if group else None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    return _make


def auth(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def make_course(db):
    """Курс из одного модуля с `lessons` текстовыми уроками.
    `quiz=True` добавляет в первый урок встроенный квиз (правильный ответ — 1)."""
    def _make(lessons: int = 2, quiz: bool = False, published: bool = True) -> Course:
        cid = f"c-{uuid.uuid4().hex[:8]}"
        course = Course(id=cid, title="Охрана труда", is_published=published)
        module = Module(id=f"{cid}-m1", title="Модуль 1", order=1, course=course)
        for i in range(lessons):
            lesson = Lesson(id=f"{cid}-l{i + 1}", title=f"Урок {i + 1}", order=i, module=module)
            lesson.blocks.append(Block(id=f"{lesson.id}-b1", type="text", content="<p>Текст</p>", order=0))
            if quiz and i == 0:
                lesson.blocks.append(Block(
                    id=f"{lesson.id}-quiz", type="quiz", order=1,
                    content='{"question": "2+2?", "options": ["3", "4"], "correctIndex": 1}',
                ))
        db.add(course)
        db.commit()
        db.refresh(course)
        return course
    return _make
