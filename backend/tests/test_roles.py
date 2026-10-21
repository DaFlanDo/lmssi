"""Ролевой доступ: студент не должен попадать в HR/админ-функции."""
import pytest

from tests.conftest import auth


@pytest.mark.parametrize("method,url", [
    ("get", "/api/users/"),
    ("get", "/api/users/hr-analytics"),
    ("post", "/api/courses/"),
    ("post", "/api/enrollments/"),
    ("get", "/api/users/stats"),
])
def test_student_forbidden(client, make_user, method, url):
    student = make_user("student")
    resp = client.request(method.upper(), url, headers=auth(student), json={})
    assert resp.status_code == 403


def test_hr_cannot_open_admin_stats(client, make_user):
    hr = make_user("hr")
    assert client.get("/api/users/stats", headers=auth(hr)).status_code == 403


def test_admin_passes_hr_checks(client, make_user):
    admin = make_user("admin")
    assert client.get("/api/users/", headers=auth(admin)).status_code == 200


def test_hr_cannot_change_roles(client, make_user):
    hr = make_user("hr")
    student = make_user("student")
    resp = client.patch(f"/api/users/{student.id}", headers=auth(hr), json={"role": "admin"})
    assert resp.status_code == 403


def test_admin_can_change_roles(client, make_user):
    admin = make_user("admin")
    student = make_user("student")
    resp = client.patch(f"/api/users/{student.id}", headers=auth(admin), json={"role": "hr"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "hr"


def test_no_token(client):
    assert client.get("/api/courses/").status_code in (401, 403)
