from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.models.org_settings import OrgSettings
from app.schemas.org_settings import OrgSettingsRead, OrgSettingsUpdate
from app.dependencies import get_current_user, require_role

router = APIRouter(prefix="/settings", tags=["Settings"])

VALID_THEMES = {"blue", "indigo", "violet", "emerald", "rose"}


def _get_or_create(db: Session) -> OrgSettings:
    s = db.query(OrgSettings).filter(OrgSettings.id == 1).first()
    if not s:
        s = OrgSettings(id=1)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.get("/organization", response_model=OrgSettingsRead)
def get_org_settings(db: Session = Depends(get_db)):
    """Публичный endpoint — настройки видны всем (нужны для страницы входа)."""
    return _get_or_create(db)


@router.put("/organization", response_model=OrgSettingsRead)
def update_org_settings(
    body: OrgSettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    s = _get_or_create(db)
    if body.name is not None:
        s.name = body.name.strip() or s.name
    if body.tagline is not None:
        s.tagline = body.tagline.strip()
    if body.logo_url is not None:
        s.logo_url = body.logo_url or None
    if body.theme is not None and body.theme in VALID_THEMES:
        s.theme = body.theme
    db.commit()
    db.refresh(s)
    return s
