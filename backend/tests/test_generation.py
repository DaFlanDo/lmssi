"""Разбор ответов LLM при генерации курса. Сеть не трогаем — проверяем
нормализацию того, что модель может вернуть (в том числе кривого)."""
import pytest

from app.services import generation as gen


def test_extract_json_plain():
    assert gen._extract_json('{"a": 1}') == {"a": 1}


def test_extract_json_markdown_fence():
    assert gen._extract_json('```json\n{"a": 1}\n```') == {"a": 1}


def test_extract_json_with_chatter_around():
    text = 'Конечно! Вот структура курса:\n{"modules": []}\nНадеюсь, помог.'
    assert gen._extract_json(text) == {"modules": []}


def test_extract_json_garbage_raises():
    with pytest.raises(ValueError):
        gen._extract_json("модель ответила текстом без JSON")


@pytest.mark.parametrize("block", [
    {"type": "text", "content": "   "},
    {"type": "quiz", "question": "?", "options": ["один"], "correctIndex": 0},
    {"type": "quiz", "question": "?", "options": ["а", "б"], "correctIndex": 5},
    {"type": "checklist", "items": ["один пункт"]},
    {"type": "unknown"},
])
def test_bad_lesson_blocks_dropped(block):
    assert gen._normalize_lesson_block(block) is None


def test_quiz_block_normalized():
    out = gen._normalize_lesson_block(
        {"type": "quiz", "question": " Что такое УЗО? ", "options": ["Автомат", " ", "Защита"], "correctIndex": 1}
    )
    assert out["type"] == "quiz"
    # Пустой вариант выкинут, correctIndex проверяется уже по очищенному списку
    assert '"options": ["Автомат", "Защита"]' in out["content"]


def test_callout_unknown_variant_falls_back_to_info():
    out = gen._normalize_lesson_block({"type": "callout", "text": "Важно", "variant": "danger"})
    assert '"variant": "info"' in out["content"]


def test_multiple_choice_question_cleaned():
    q = gen._clean_quiz_question({
        "type": "multiple", "question": "Выберите СИЗ",
        "options": ["Каска", "Перчатки", "Телефон"], "correctIndices": [1, 0, 0, 9],
    })
    assert q["correctIndices"] == [0, 1]
    assert q["correctIndex"] == 0


def test_question_without_valid_answer_dropped():
    assert gen._clean_quiz_question({"question": "?", "options": ["а", "б"]}) is None
