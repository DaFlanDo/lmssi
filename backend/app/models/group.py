from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base

# Курсы, привязанные к группе (отделу или должности). Порядок задаёт
# траекторию обучения. Курсы наследуются вниз по иерархии: сотрудник
# должности получает курсы должности + курсы её отдела-родителя.
group_course = Table(
    "group_course",
    Base.metadata,
    Column("group_id", Integer, ForeignKey("groups.id"), primary_key=True),
    Column("course_id", String, ForeignKey("courses.id"), primary_key=True),
    Column("order", Integer, default=0, server_default="0"),
)


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    parent = relationship("Group", remote_side=[id], backref="children")
    users = relationship("User", back_populates="group")
    courses = relationship(
        "Course",
        secondary=group_course,
        order_by=group_course.c.order,
        backref="groups",
    )
