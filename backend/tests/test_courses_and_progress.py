"""Видимость курсов, прохождение уроков и выдача сертификатов."""
from app.models import Enrollment
from tests.conftest import auth


def enroll(db, user, course):
    db.add(Enrollment(user_id=user.id, course_id=course.id))
    db.commit()


def complete(client, user, lesson_id):
    return client.put(f"/api/progress/lessons/{lesson_id}/complete", headers=auth(user))


# ── Видимость ────────────────────────────────────────────────────────────────

def test_student_sees_only_assigned_courses(client, db, make_user, make_course):
    student = make_user()
    mine, foreign = make_course(), make_course()
    enroll(db, student, mine)

    ids = [c["id"] for c in client.get("/api/courses/", headers=auth(student)).json()]
    assert ids == [mine.id]
    assert client.get(f"/api/courses/{foreign.id}", headers=auth(student)).status_code == 404


def test_student_does_not_see_unpublished_course(client, db, make_user, make_course):
    student = make_user()
    draft = make_course(published=False)
    enroll(db, student, draft)
    assert client.get("/api/courses/", headers=auth(student)).json() == []


def test_hr_sees_all_courses(client, make_user, make_course):
    make_course(), make_course(published=False)
    hr = make_user("hr")
    assert len(client.get("/api/courses/", headers=auth(hr)).json()) == 2


def test_hr_enrolls_student_once(client, make_user, make_course):
    hr, student, course = make_user("hr"), make_user(), make_course()
    body = {"user_id": student.id, "course_id": course.id}
    assert client.post("/api/enrollments/", headers=auth(hr), json=body).status_code == 201
    assert client.post("/api/enrollments/", headers=auth(hr), json=body).status_code == 400


# ── Прохождение и сертификат ─────────────────────────────────────────────────

def test_certificate_issued_only_after_all_lessons(client, db, make_user, make_course):
    student, course = make_user(), make_course(lessons=2)
    enroll(db, student, course)
    first, second = course.modules[0].lessons

    resp = complete(client, student, first.id)
    assert resp.status_code == 200
    assert resp.json()["certificate_number"] is None

    progress = client.get(f"/api/progress/courses/{course.id}", headers=auth(student)).json()
    assert progress["progress_percent"] == 50

    resp = complete(client, student, second.id)
    assert resp.json()["new_certificate"] is True
    number = resp.json()["certificate_number"]

    # Повторное завершение не выдаёт второй сертификат
    again = complete(client, student, second.id).json()
    assert again["certificate_number"] == number
    assert again["new_certificate"] is False

    db.refresh(course.enrollments[0])
    assert course.enrollments[0].completed_at is not None


def test_cannot_issue_certificate_manually_before_finishing(client, db, make_user, make_course):
    student, course = make_user(), make_course(lessons=2)
    enroll(db, student, course)
    complete(client, student, course.modules[0].lessons[0].id)

    resp = client.post(f"/api/certificates/issue/{course.id}", headers=auth(student))
    assert resp.status_code == 400


def test_lesson_with_quiz_requires_correct_answer(client, db, make_user, make_course):
    student, course = make_user(), make_course(lessons=1, quiz=True)
    enroll(db, student, course)
    lesson = course.modules[0].lessons[0]
    quiz_block = next(b for b in lesson.blocks if b.type == "quiz")

    assert complete(client, student, lesson.id).status_code == 409

    wrong = client.post("/api/progress/quiz", headers=auth(student),
                        json={"lesson_id": lesson.id, "block_id": quiz_block.id, "answers": {"0": 0}})
    assert wrong.json()["passed"] is False
    assert complete(client, student, lesson.id).status_code == 409

    right = client.post("/api/progress/quiz", headers=auth(student),
                        json={"lesson_id": lesson.id, "block_id": quiz_block.id, "answers": {"0": 1}})
    assert right.json()["passed"] is True
    assert complete(client, student, lesson.id).status_code == 200


def test_student_cannot_complete_foreign_course(client, make_user, make_course):
    """Зная id урока чужого курса, нельзя «пройти» его и получить сертификат."""
    student, course = make_user(), make_course(lessons=1)
    resp = complete(client, student, course.modules[0].lessons[0].id)
    assert resp.status_code == 404


# ── Публичная проверка сертификата ───────────────────────────────────────────

def test_public_certificate_verification(client, db, make_user, make_course):
    student, course = make_user(full_name="Иванов Иван"), make_course(lessons=1)
    enroll(db, student, course)
    number = complete(client, student, course.modules[0].lessons[0].id).json()["certificate_number"]

    # Без токена — страница по QR-коду открывается кем угодно
    ok = client.get(f"/api/certificates/verify/{number}").json()
    assert ok["valid"] is True
    assert ok["user_full_name"] == "Иванов Иван"
    assert ok["course_title"] == course.title

    fake = client.get("/api/certificates/verify/LMS-0000-FAKE").json()
    assert fake["valid"] is False


def test_other_student_cannot_open_certificate_details(client, db, make_user, make_course):
    owner, stranger, course = make_user(), make_user(), make_course(lessons=1)
    enroll(db, owner, course)
    number = complete(client, owner, course.modules[0].lessons[0].id).json()["certificate_number"]

    resp = client.get(f"/api/certificates/by-number/{number}", headers=auth(stranger))
    assert resp.status_code == 403
