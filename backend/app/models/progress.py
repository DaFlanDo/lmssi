from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id"), nullable=False)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),
    )

    user = relationship("User", back_populates="lesson_progress")
    lesson = relationship("Lesson", back_populates="progress")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id"), nullable=False)
    block_id = Column(String, ForeignKey("blocks.id"), nullable=False)
    answers = Column(JSON, nullable=False)  # {"questionIndex": selectedOption}
    score = Column(Integer, default=0)  # Процент правильных
    passed = Column(Boolean, default=False)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="quiz_attempts")
    block = relationship("Block", back_populates="quiz_attempts")


class ModuleTestAttempt(Base):
    __tablename__ = "module_test_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    test_id = Column(String, ForeignKey("module_tests.id"), nullable=False)
    answers = Column(JSON, nullable=False)   # {question_id: selected_index}
    score = Column(Integer, default=0)       # процент правильных
    passed = Column(Boolean, default=False)
    # Прокторинг: сколько раз студент покидал окно теста во время прохождения
    focus_violations = Column(Integer, default=0, nullable=False)
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class VideoProgress(Base):
    """Максимальная достигнутая доля просмотра видео-блока (для гейта require_video).

    Хранится на сервере, чтобы завершение урока нельзя было подделать с клиента.
    """
    __tablename__ = "video_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    block_id = Column(String, ForeignKey("blocks.id"), nullable=False)
    watched_ratio = Column(Integer, default=0)  # 0..100, максимум за все просмотры
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "block_id", name="uq_user_video_block"),
    )

    user = relationship("User")


class OpenAnswerAttempt(Base):
    """Попытка ответа на открытый вопрос с ИИ-оценкой."""
    __tablename__ = "open_answer_attempts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_id = Column(String, ForeignKey("lessons.id"), nullable=False)
    block_id = Column(String, ForeignKey("blocks.id"), nullable=False)
    answer = Column(Text, nullable=False)
    score = Column(Integer, default=0)       # 0..100, выставляет ИИ
    passed = Column(Boolean, default=False)
    feedback = Column(Text, nullable=True)   # объяснение оценки от ИИ
    attempted_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
