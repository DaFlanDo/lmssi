"""AI-генерация пула вопросов для печатных тестов (claude-haiku-4.5)."""
from __future__ import annotations

import json
import re
import uuid
from typing import Any

from openai import OpenAI

from app.config import get_settings

settings = get_settings()

HAIKU_MODEL = "claude-haiku-4.5"


def _get_client() -> OpenAI:
    return OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    )


def _salvage_objects(text: str) -> list[Any]:
    """Достаёт отдельные JSON-объекты из текста по балансу скобок.

    Спасает ответ, если массив оборвался по лимиту токенов (нет закрывающей `]`)
    или содержит лишний текст: каждый полноценный {...} парсится отдельно,
    незавершённый последний объект просто пропускается.
    """
    objects: list[Any] = []
    depth = 0
    start = -1
    in_str = False
    escape = False
    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue
        if ch == "\\":
            escape = True
            continue
        if ch == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            if depth > 0:
                depth -= 1
                if depth == 0 and start != -1:
                    try:
                        objects.append(json.loads(text[start:i + 1]))
                    except json.JSONDecodeError:
                        pass
                    start = -1
    return objects


def _extract_json_list(text: str) -> list[Any]:
    text = text.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        if isinstance(result, dict) and "questions" in result:
            return result["questions"]
        return []
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    # Последний рубеж: ответ оборвался или замусорен — собираем объекты вручную.
    return _salvage_objects(text)


def generate_title(source_text: str) -> str:
    """Генерирует краткое русское название теста из текста документа."""
    client = _get_client()
    prompt = f"""Придумай краткое название теста для сотрудников (3–6 слов) на основе текста документа.
Требования: только русский язык, без кавычек, без точки в конце, с заглавной буквы.
Верни ТОЛЬКО название, без пояснений.

Начало документа:
---
{source_text[:3000]}
---"""
    try:
        resp = client.chat.completions.create(
            model=HAIKU_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=60,
        )
        title = (resp.choices[0].message.content or "").strip().strip('"\'').strip()
        return title if title else "Тест по документу"
    except Exception:
        return "Тест по документу"


def generate_questions_from_document(source_text: str, topic_hint: str = "") -> list[dict]:
    """Генерирует пул вопросов на основе текста документа через claude-haiku-4.5."""
    client = _get_client()

    hint_line = f'\nДополнительный акцент: "{topic_hint}"' if topic_hint.strip() else ""

    prompt = f"""Ты — эксперт по составлению тестовых вопросов для корпоративного обучения на русском языке.

На основе предоставленного материала создай максимально возможное количество уникальных вопросов (стремись к 40–50).{hint_line}

Вопросы должны:
- Проверять понимание ключевых фактов, понятий и процедур из документа
- Охватывать разные части материала равномерно
- Быть разного уровня сложности — от базовых до аналитических
- Иметь 4 варианта ответа (A, B, C, D), ровно один из которых правильный
- Не повторяться и не дублировать смысл друг друга
- Быть написаны только на русском языке

Верни ТОЛЬКО JSON-массив без пояснений:
[
  {{
    "id": "uuid_hex",
    "question": "Текст вопроса?",
    "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
    "correct_index": 0
  }},
  ...
]

Материал для изучения:
---
{source_text[:55000]}
---"""

    response = client.chat.completions.create(
        model=HAIKU_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.8,
        max_tokens=16000,
    )

    raw = response.choices[0].message.content or ""
    raw_questions = _extract_json_list(raw)

    result = []
    for q in raw_questions:
        if not isinstance(q, dict):
            continue
        if "question" not in q or "options" not in q or "correct_index" not in q:
            continue
        options = q.get("options", [])
        if not isinstance(options, list) or len(options) < 2:
            continue
        try:
            correct = int(q["correct_index"])
        except (ValueError, TypeError):
            continue
        if correct < 0 or correct >= len(options):
            continue
        result.append({
            "id": q.get("id") or uuid.uuid4().hex,
            "question": str(q["question"]).strip(),
            "options": [str(o).strip() for o in options],
            "correct_index": correct,
        })

    return result
