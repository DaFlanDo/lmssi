from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Certificate(Base):
    """Сертификат о прохождении курса.

    Выдаётся автоматически, когда пользователь завершает 100% уроков курса.
    Имеет уникальный человекочитаемый номер для публичной верификации.
    """
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Например: BHP-2025-000042
    certificate_number = Column(String, unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    # Средний балл по тестам курса (0..100). Может быть None если тестов не было.
    score = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_user_course_cert"),
    )

    user = relationship("User", backref="certificates")
    course = relationship("Course", backref="certificates")