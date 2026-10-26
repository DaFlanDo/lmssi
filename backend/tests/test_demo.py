"""Демо-режим: вход без пароля, защита общих аккаунтов, лимит ИИ-запросов."""
from __future__ import annotations

import pytest

from app.config import get_settings
from app.services import demo
from tests.conftest import auth


@pytest.fixture
def demo_mode(monkeypatch):
    monkeypatch.setattr(get_settings(), "demo_mode", True)
    demo.reset_ai_quota()
    yield
    demo.reset_ai_quota()


@pytest.fixture
def demo_users(make_user):
    return {
        role: make_user(role, email=email)
        for role, email in demo.DEMO_ACCOUNTS.items()
    }


def test_demo_login_disabled_by_default(client, demo_users):
    assert client.get("/api/auth/demo").json()["enabled"] is False
    assert client.post("/api/auth/demo", json={"role": "hr"}).status_code == 404


def test_demo_login_issues_token_for_role(client, demo_mode, demo_users):
    info = client.get("/api/auth/demo").json()
    assert info["enabled"] is True and set(info["accounts"]) == {"student", "hr", "admin"}

    r = client.post("/api/auth/demo", json={"role": "hr"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).json()
    assert me["email"] == "hr@barhleb.by" and me["role"] == "hr"


def test_demo_login_rejects_unknown_role(client, demo_mode, demo_users):
    assert client.post("/api/auth/demo", json={"role": "root"}).status_code == 422


def test_demo_accounts_are_protected(client, demo_mode, demo_users):
    admin, hr = demo_users["admin"], demo_users["hr"]

    r = client.post("/api/auth/change-password", headers=auth(hr),
                    json={"current_password": "secret123", "new_password": "hacked123"})
    assert r.status_code == 403
    assert client.delete(f"/api/users/{hr.id}", headers=auth(admin)).status_code == 403
    assert client.patch(f"/api/users/{hr.id}", headers=auth(admin),
                        json={"is_active": False}).status_code == 403
    assert client.post(f"/api/users/{hr.id}/reset-password", headers=auth(admin),
                       json={"new_password": "hacked123"}).status_code == 403
    # Имя менять можно — ночной сброс всё вернёт
    assert client.patch(f"/api/users/{hr.id}", headers=auth(admin),
                        json={"full_name": "Новое Имя"}).status_code == 200


def test_regular_users_unaffected_in_demo_mode(client, demo_mode, demo_users, make_user):
    other = make_user("student")
    assert client.delete(f"/api/users/{other.id}", headers=auth(demo_users["admin"])).status_code == 200


def test_ai_quota_for_demo_accounts(demo_mode, demo_users, monkeypatch):
    monkeypatch.setitem(demo.AI_LIMITS_PER_HOUR, "assistant", 2)
    student = demo_users["student"]
    demo.check_ai_quota(student, "assistant")
    demo.check_ai_quota(student, "assistant")
    with pytest.raises(Exception) as exc:
        demo.check_ai_quota(student, "assistant")
    assert exc.value.status_code == 429
