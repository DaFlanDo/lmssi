from sqlalchemy import Column, Integer, String
from app.database import Base


class OrgSettings(Base):
    __tablename__ = "org_settings"

    id = Column(Integer, primary_key=True, default=1)
    name = Column(String(200), nullable=False, default="Lumen LMS")
    tagline = Column(String(300), nullable=False, default="Корпоративная платформа обучения")
    logo_url = Column(String(500), nullable=True)
    theme = Column(String(20), nullable=False, default="blue")
