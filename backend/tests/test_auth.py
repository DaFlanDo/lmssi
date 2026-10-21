from tests.conftest import auth


def test_register_always_creates_student(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@example.com",
        "identification_number": "1234567a001pb1",
        "full_name": "Новый Сотрудник",
        "password": "secret123",
        # Лишнее поле role должно игнорироваться — админом себя не сделать
        "role": "admin",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["role"] == "student"
    assert body["user"]["identification_number"] == "1234567A001PB1"


def test_register_rejects_duplicate_email(client, make_user):
    user = make_user()
    resp = client.post("/api/auth/register", json={
        "email": user.email,
        "identification_number": "X1",
        "full_name": "Дубль",
        "password": "secret123",
    })
    assert resp.status_code == 400


def test_login_ok_and_me(client, make_user):
    user = make_user(password="pa55word")
    resp = client.post("/api/auth/login", json={"email": user.email, "password": "pa55word"})
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == user.email


def test_login_wrong_password(client, make_user):
    user = make_user(password="pa55word")
    resp = client.post("/api/auth/login", json={"email": user.email, "password": "nope"})
    assert resp.status_code == 401


def test_login_deactivated_user(client, make_user):
    user = make_user(password="pa55word", is_active=False)
    resp = client.post("/api/auth/login", json={"email": user.email, "password": "pa55word"})
    assert resp.status_code == 403


def test_token_of_deactivated_user_stops_working(client, make_user, db):
    user = make_user()
    headers = auth(user)
    assert client.get("/api/auth/me", headers=headers).status_code == 200

    user.is_active = False
    db.commit()
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_garbage_token_rejected(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert resp.status_code == 401


def test_token_signed_with_other_key_rejected(client, make_user):
    from jose import jwt

    user = make_user(role="admin")
    forged = jwt.encode({"sub": str(user.id), "role": "admin"}, "other-key", algorithm="HS256")
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert resp.status_code == 401
