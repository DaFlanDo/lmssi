import io
import os

from app.config import get_settings
from tests.conftest import auth


def upload(client, user, name, data=b"x"):
    return client.post("/api/upload/", headers=auth(user),
                       files={"file": (name, io.BytesIO(data), "application/octet-stream")})


def test_hr_uploads_image(client, make_user):
    resp = upload(client, make_user("hr"), "cover.PNG")
    assert resp.status_code == 200
    name = resp.json()["url"].rsplit("/", 1)[-1]
    assert name.endswith(".png")
    assert os.path.exists(os.path.join(get_settings().upload_dir, name))


def test_student_cannot_upload(client, make_user):
    assert upload(client, make_user("student"), "cover.png").status_code == 403


def test_scriptable_files_rejected(client, make_user):
    hr = make_user("hr")
    for name in ("evil.html", "logo.svg", "run.sh", "noext"):
        assert upload(client, hr, name).status_code == 400, name


def test_oversized_file_rejected_and_removed(client, make_user, monkeypatch):
    settings = get_settings()
    monkeypatch.setattr(settings, "max_upload_mb", 1)
    before = set(os.listdir(settings.upload_dir))

    resp = upload(client, make_user("hr"), "big.mp4", data=b"0" * (1024 * 1024 + 1))
    assert resp.status_code == 413
    assert set(os.listdir(settings.upload_dir)) == before
