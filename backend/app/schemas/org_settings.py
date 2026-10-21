from __future__ import annotations
from pydantic import BaseModel
from typing import Optional


class OrgSettingsRead(BaseModel):
    name: str
    tagline: str
    logo_url: Optional[str] = None
    theme: str

    model_config = {"from_attributes": True}


class OrgSettingsUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    theme: Optional[str] = None
