from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, nullable=False, index=True)
    identification_number = Column(String(14), unique=True, nullable=True, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="student")  # "admin" | "hr" | "student"
    is_active = Column(Boolean, default=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    group = relationship("Group", back_populates="users")

    # Курсы, которые пользователь создал (HR)
    created_courses = relationship("Course", back_populates="creator", foreign_keys="Course.created_by")
    # Назначения на курсы
    enrollments = relationship("Enrollment", back_populates="user", foreign_keys="Enrollment.user_id")
    # Прогресс по урокам
    lesson_progress = relationship("LessonProgress", back_populates="user")
    # Попытки тестов
    quiz_attempts = relationship("QuizAttempt", back_populates="user")
