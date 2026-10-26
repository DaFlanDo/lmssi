"""Конструктор демо-курсов: блоки уроков, вопросы тестов и запись курса в БД.

Курсы описываются данными (см. seed_courses.py), а здесь — как эти данные
превращаются в строки Course / Module / Lesson / Block / ModuleTest.
"""
from __future__ import annotations

import html
import json

from app.models.course import Block, Course, Lesson, Module, ModuleTest
from app.models.group import Group, group_course

YT = "https://www.youtube.com/watch?v="


# ── блоки урока: (тип, content) ──────────────────────────────────────────────
def text(markup: str):            return ("text", markup.strip())
def video(youtube_id: str):       return ("video", YT + youtube_id)
def image(upload_name: str):      return ("video", "/static/" + upload_name)
def callout(variant: str, t: str): return ("callout", json.dumps({"variant": variant, "text": t}, ensure_ascii=False))
def checklist(items: list[str]):  return ("checklist", json.dumps({"items": items}, ensure_ascii=False))
def openq(prompt: str, criteria: str):
    return ("open_answer", json.dumps({"prompt": prompt, "criteria": criteria}, ensure_ascii=False))
def quiz(question: str, options: list[str], correct: int):
    return ("quiz", json.dumps({"question": question, "options": options, "correctIndex": correct}, ensure_ascii=False))


def code(source: str, caption: str = ""):
    """Блок кода. Стили инлайном — текстовый блок рендерится как есть, без prose-CSS."""
    head = (f'<p style="margin:14px 0 6px;font-size:13px;font-weight:700;color:#64748b">{html.escape(caption)}</p>'
            if caption else "")
    return ("text", head +
            '<pre style="background:#0f172a;color:#e2e8f0;padding:16px 18px;border-radius:14px;'
            'overflow-x:auto;font-size:14px;line-height:1.6;margin:8px 0 14px">'
            f'<code style="font-family:JetBrains Mono,Menlo,Consolas,monospace;background:none;padding:0;'
            f'color:inherit;font-size:inherit;border:0">{html.escape(source.strip())}</code></pre>')


def table(headers: list[str], rows: list[list[str]]):
    th = "".join(f'<th style="border:1px solid #cbd5e1;padding:9px 13px;background:#eff6ff;'
                 f'text-align:left;font-weight:700;color:#1e3a8a">{h}</th>' for h in headers)
    body = "".join(
        "<tr>" + "".join(f'<td style="border:1px solid #e2e8f0;padding:9px 13px;color:#334155">{c}</td>'
                         for c in row) + "</tr>"
        for row in rows)
    return ("text", f'<table style="border-collapse:collapse;width:100%;margin:14px 0;font-size:15px">'
                    f'<thead><tr>{th}</tr></thead><tbody>{body}</tbody></table>')


# ── вопросы тестов ───────────────────────────────────────────────────────────
def single(i, q, opts, ci):    return {"id": f"q{i}", "type": "single", "question": q, "options": opts, "correctIndex": ci}
def multiple(i, q, opts, corr): return {"id": f"q{i}", "type": "multiple", "question": q, "options": opts,
                                        "correctIndex": 0, "correctIndices": corr}
def boolean(i, q, is_true):    return {"id": f"q{i}", "type": "boolean", "question": q,
                                       "options": ["Верно", "Неверно"], "correctIndex": 0 if is_true else 1}
def short(i, q, accepted):     return {"id": f"q{i}", "type": "short", "question": q, "options": [],
                                       "correctIndex": 0, "correctText": accepted}
def ordering(i, q, ordered):   return {"id": f"q{i}", "type": "ordering", "question": q, "options": ordered,
                                       "correctIndex": 0}


# ── структура курса ──────────────────────────────────────────────────────────
def lesson(title, kind, *blocks, minutes=15):
    return {"title": title, "type": kind, "blocks": list(blocks), "duration": f"{minutes} мин"}


def module(title, lessons, test=None):
    return {"title": title, "lessons": lessons, "test": test}


def test(title, questions, kind="module", pass_=70, time=0, per=0):
    return {"title": title, "type": kind, "content": {
        "questions": questions, "pass_threshold": pass_, "shuffle_questions": True,
        "shuffle_options": True, "show_correct_answers": True,
        "questions_per_attempt": per, "time_limit_min": time}}


# ── запись в БД ──────────────────────────────────────────────────────────────
def insert_course(db, data: dict, author_id: int | None, cover: str | None) -> Course:
    course = Course(id=data["id"], title=data["title"], description=data["description"],
                    is_published=True, cover_image=cover, created_by=author_id,
                    sequential=data.get("sequential", False), require_video=data.get("require_video", False))
    db.add(course)
    db.flush()
    for mi, m in enumerate(data["modules"]):
        mid = f'{data["id"]}_m{mi}'
        db.add(Module(id=mid, title=m["title"], order=mi, course_id=course.id))
        for li, les in enumerate(m["lessons"]):
            lid = f"{mid}_l{li}"
            db.add(Lesson(id=lid, title=les["title"], type=les["type"], duration=les["duration"],
                          order=li, module_id=mid))
            for bi, (btype, content) in enumerate(les["blocks"]):
                db.add(Block(id=f"{lid}_b{bi}", type=btype, content=content, order=bi, lesson_id=lid))
        if m.get("test"):
            t = m["test"]
            db.add(ModuleTest(id=f"{mid}_t", module_id=mid, type=t["type"], title=t["title"],
                              content=json.dumps(t["content"], ensure_ascii=False), order=0))
    if data.get("final"):
        # Итоговый тест курса живёт в служебном модуле __root__ (так его создаёт конструктор)
        rid = f'{data["id"]}_root'
        db.add(Module(id=rid, title="__root__", order=9999, course_id=course.id))
        t = data["final"]
        db.add(ModuleTest(id=f"{rid}_t", module_id=rid, type="final", title=t["title"],
                          content=json.dumps(t["content"], ensure_ascii=False), order=0))
    db.commit()
    return course


def get_or_create_group(db, name: str, parent_id: int | None = None, description: str | None = None) -> Group:
    group = db.query(Group).filter(Group.name == name, Group.parent_id == parent_id).first()
    if not group:
        group = Group(name=name, parent_id=parent_id, description=description)
        db.add(group)
        db.commit()
        db.refresh(group)
    return group


def bind_courses(db, group: Group, course_ids: list[str]) -> None:
    """Программа обучения должности/отдела: курсы в заданном порядке."""
    for order, cid in enumerate(course_ids):
        exists = db.execute(group_course.select().where(
            (group_course.c.group_id == group.id) & (group_course.c.course_id == cid))).first()
        if not exists:
            db.execute(group_course.insert().values(group_id=group.id, course_id=cid, order=order))
    db.commit()
