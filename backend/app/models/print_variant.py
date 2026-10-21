from __future__ import annotations
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey

from app.database import Base


class PrintVariant(Base):
    __tablename__ = "print_variants"

    code = Column(String(8), primary_key=True)
    test_id = Column(String, ForeignKey("print_tests.id", ondelete="CASCADE"))
    test_title = Column(String, nullable=False)
    questions_snapshot = Column(Text, nullable=False)  # JSON, зафиксированный набор
    created_at = Column(DateTime, default=datetime.utcnow)
