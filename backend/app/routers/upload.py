from __future__ import annotations
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status

from app.models import User
from app.config import get_settings
from app.dependencies import require_role

router = APIRouter(prefix="/upload", tags=["Upload"])
settings = get_settings()

# Только то, что реально загружает фронт: картинки (обложки, логотип) и видео.
# SVG и HTML не пускаем — они отдаются с нашего домена и могут содержать скрипты.
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "mp4", "webm"}
CHUNK_SIZE = 1024 * 1024


@router.post("/")
def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(require_role("hr")),
):
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимый тип файла. Разрешены: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    unique_name = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join(settings.upload_dir, unique_name)
    max_bytes = settings.max_upload_mb * 1024 * 1024

    written = 0
    try:
        with open(filepath, "wb") as buffer:
            while chunk := file.file.read(CHUNK_SIZE):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"Файл больше {settings.max_upload_mb} МБ",
                    )
                buffer.write(chunk)
    except HTTPException:
        os.remove(filepath)
        raise

    return {"url": f"/static/{unique_name}"}
