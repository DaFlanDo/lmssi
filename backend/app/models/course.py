from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True, default="")
    is_published = Column(Boolean, default=True)
    cover_image = Column(String, nullable=True, default=None)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Последовательное прохождение: следующий урок/тест открывается только после
    # завершения предыдущего (и сдачи теста модуля).
    sequential = Column(Boolean, default=False, nullable=False)
    # Обязательный просмотр видео: урок с видео нельзя завершить, пока ролик
    # не досмотрен (≈90%). Честный зачёт вместо клика по кнопке.
    require_video = Column(Boolean, default=False, nullable=False)

    creator = relationship("User", back_populates="created_courses")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan", order_by="Module.order")
    enrollments = relationship("Enrollment", back_populates="course", cascade="all, delete-orphan")


class Module(Base):
    __tablename__ = "modules"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    order = Column(Integer, default=0)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)

    course = relationship("Course", back_populates="modules")
    lessons = relationship("Lesson", back_populates="module", cascade="all, delete-orphan", order_by="Lesson.order")
    tests = relationship("ModuleTest", back_populates="module", cascade="all, delete-orphan", order_by="ModuleTest.order")


class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    type = Column(String, default="text")  # "text" | "video" | "quiz"
    duration = Column(String, default="15 мин")
    order = Column(Integer, default=0)
    module_id = Column(String, ForeignKey("modules.id"), nullable=False)

    module = relationship("Module", back_populates="lessons")
    blocks = relationship("Block", back_populates="lesson", cascade="all, delete-orphan", order_by="Block.order")
    progress = relationship("LessonProgress", back_populates="lesson", cascade="all, delete-orphan")


class Block(Base):
    __tablename__ = "blocks"

    id = Column(String, primary_key=True, index=True)
    type = Column(String, default="text")  # "text" | "video" | "quiz" | "ai"
    content = Column(Text, default="")
    order = Column(Integer, default=0)
    lesson_id = Column(String, ForeignKey("lessons.id"), nullable=False)

    lesson = relationship("Lesson", back_populates="blocks")
    quiz_attempts = relationship("QuizAttempt", back_populates="block", cascade="all, delete-orphan")


class ModuleTest(Base):
    __tablename__ = "module_tests"

    id = Column(String, primary_key=True, index=True)
    module_id = Column(String, ForeignKey("modules.id"), nullable=False)
    # 'module' — по модулю, 'block' — по блоку, 'final' — итоговый
    type = Column(String, default="module")
    title = Column(String, nullable=False, default="")
    content = Column(Text, default="")  # JSON: {questions, pass_threshold}
    order = Column(Integer, default=0)

    module = relationship("Module", back_populates="tests")
