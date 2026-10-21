from __future__ import annotations
import os
import uuid
import shutil

from fastapi import APIRouter, Depends, UploadFile, File

from app.models import User
from app.config import get_settings
from app.dependencies import require_role

router = APIRouter(prefix="/upload", tags=["Upload"])
settings = get_settings()


@router.post("/")
def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(require_role("hr")),
):
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    unique_name = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.upload_dir, unique_name)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {"url": f"/static/{unique_name}"}
