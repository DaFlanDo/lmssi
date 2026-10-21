from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey

from app.database import Base


class PrintTest(Base):
    __tablename__ = "print_tests"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    topic = Column(String, nullable=False)
    course_id = Column(String, ForeignKey("courses.id"), nullable=True)
    questions_pool = Column(Text, nullable=False)
    questions_per_test = Column(Integer, default=10)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
