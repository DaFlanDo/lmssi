"""
Генерация курса из документа (PDF/DOCX/PPTX/TXT) с помощью OpenAI API.

Этапы:
1. extract_text — парсим файл в обычный текст
2. generate_outline — LLM строит структуру курса (модули → уроки)
3. generate_lesson_blocks — для каждого урока генерим блоки контента (текст + квиз)
4. build_course_payload — собираем итоговую структуру под наши Pydantic-схемы
"""
from __future__ import annotations

import io
import json
import logging
import re
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Optional

log = logging.getLogger("generation")
log.setLevel(logging.INFO)

from openai import OpenAI
from pypdf import PdfReader
from docx import Document as DocxDocument
from pptx import Presentation

from app.config import get_settings

settings = get_settings()

# ── Лимит на размер исходного текста, отправляемого LLM ───────────────────────
# gpt-4o-mini держит 128k context, но мы режем для скорости и стоимости.
MAX_SOURCE_CHARS = 60_000


def _extract_json(text: str) -> dict[str, Any]:
    """Парсит JSON из ответа LLM. Поддерживает markdown-обёртку ```json ... ```."""
    text = text.strip()
    # Убираем markdown-обёртку, если есть
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Ищем первый { ... } блок
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        raise


def _chat_json(system: str, user: str, temperature: float = 0.5) -> dict[str, Any]:
    """Вызов LLM с ожиданием JSON-ответа. Устойчив к моделям без json_mode."""
    client = _client()
    kwargs: dict[str, Any] = {
        "model": settings.openai_model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system + "\n\nВАЖНО: ответь ТОЛЬКО валидным JSON, без markdown-обёртки и пояснений."},
            {"role": "user", "content": user},
        ],
    }
    # Пробуем включить json mode (поддерживается не всеми моделями)
    try:
        resp = client.chat.completions.create(
            response_format={"type": "json_object"}, **kwargs
        )
    except Exception:
        resp = client.chat.completions.create(**kwargs)
    return _extract_json(resp.choices[0].message.content or "")


def _client() -> OpenAI:
    if not settings.openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY не задан. Добавьте ключ в backend/.env"
        )
    return OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    )


# ── 1. Парсинг файлов ─────────────────────────────────────────────────────────
def extract_text(filename: str, data: bytes) -> str:
    """Универсальный парсер: PDF/DOCX/PPTX/TXT → plain text."""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return _extract_pdf(data)
    if name.endswith(".docx"):
        return _extract_docx(data)
    if name.endswith(".pptx"):
        return _extract_pptx(data)
    if name.endswith(".txt"):
        return data.decode("utf-8", errors="ignore")
    raise ValueError(f"Неподдерживаемый тип файла: {filename}")


def _extract_pdf(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:
            continue
    return "\n\n".join(parts).strip()


def _extract_docx(data: bytes) -> str:
    doc = DocxDocument(io.BytesIO(data))
    parts = [p.text for p in doc.paragraphs if p.text.strip()]
    # Таблицы тоже забираем
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n".join(parts).strip()


def _extract_pptx(data: bytes) -> str:
    """Парсим презентацию: текст из фигур, таблиц и заметок докладчика по слайдам."""
    prs = Presentation(io.BytesIO(data))
    parts: list[str] = []
    for idx, slide in enumerate(prs.slides, start=1):
        slide_parts: list[str] = []
        for shape in slide.shapes:
            if shape.has_text_frame:
                text = "\n".join(
                    p.text for p in shape.text_frame.paragraphs if p.text.strip()
                )
                if text.strip():
                    slide_parts.append(text.strip())
            if shape.has_table:
                for row in shape.table.rows:
                    cells = [c.text.strip() for c in row.cells if c.text.strip()]
                    if cells:
                        slide_parts.append(" | ".join(cells))
        # Заметки докладчика — часто там основное содержание
        if slide.has_notes_slide:
            notes = (slide.notes_slide.notes_text_frame.text or "").strip()
            if notes:
                slide_parts.append(f"Заметки: {notes}")
        if slide_parts:
            parts.append(f"[Слайд {idx}]\n" + "\n".join(slide_parts))
    return "\n\n".join(parts).strip()


# ── 1b. Оценка «вместимости» материала ────────────────────────────────────────
# Грубая эвристика: сколько уроков реально можно раскрыть из текста, не наливая воды.
# Порог ~600 значимых символов на урок; верхняя планка совпадает с самым объёмным
# пресетом фронтенда (5 модулей × 4 урока = 20).
CHARS_PER_LESSON = 600
MAX_ESTIMATED_LESSONS = 20


def estimate_lesson_capacity(text: str) -> int:
    """Сколько уроков осмысленно сгенерировать из данного текста (1..20)."""
    chars = len((text or "").strip())
    return max(1, min(MAX_ESTIMATED_LESSONS, chars // CHARS_PER_LESSON))


# ── 1c. Стиль изложения и уровень аудитории ───────────────────────────────────
TONE_DIRECTIVES = {
    "official": "Стиль изложения: официально-деловой, нейтральный, как в корпоративном регламенте.",
    "friendly": "Стиль изложения: дружелюбный, обращайся на «вы», поясняй простыми словами и примерами.",
    "concise":  "Стиль изложения: максимально лаконичный — только суть, короткие формулировки, без вступлений.",
}
LEVEL_DIRECTIVES = {
    "novice":      "Уровень аудитории: новички. Объясняй базовые понятия, расшифровывай термины при первом упоминании.",
    "experienced": "Уровень аудитории: опытные сотрудники. Не разжёвывай основы, сразу по сути, профтермины допустимы.",
}


def _style_directive(tone: str = "official", level: str = "novice") -> str:
    """Собирает инструкцию по стилю и уровню для подстановки в промпты."""
    return (
        TONE_DIRECTIVES.get(tone, TONE_DIRECTIVES["official"]) + "\n"
        + LEVEL_DIRECTIVES.get(level, LEVEL_DIRECTIVES["novice"])
    )


# ── 2. Генерация структуры курса (outline) ───────────────────────────────────
OUTLINE_SYSTEM = """Ты — опытный методист корпоративного обучения. Твоя задача — \
на основе исходного документа составить структуру обучающего курса для сотрудников предприятия.

Правила:
- Разбей материал на логичные модули и уроки.
- Заголовки должны быть конкретными и деловыми, без воды.
- summary — краткое описание (1–2 предложения), что именно изучается в уроке.
- ГЛАВНОЕ ПРАВИЛО ОБЪЁМА: указанные числа модулей и уроков — это ВЕРХНЯЯ ГРАНИЦА, а не обязательство. \
Если исходного материала мало — сделай МЕНЬШЕ модулей и уроков. Каждый урок обязан опираться на реальный \
материал документа. Лучше короткий честный курс, чем раздутый из воды и повторов.
- НЕ придумывай факты, которых нет в источнике, ради заполнения объёма. Не дроби одну мысль на несколько уроков.
- Отвечай ТОЛЬКО валидным JSON, без markdown-обёртки.

Формат ответа:
{
  "title": "Название курса",
  "description": "Краткое описание курса (1-2 предложения)",
  "modules": [
    {
      "title": "Название модуля",
      "lessons": [
        { "title": "Название урока", "summary": "Что изучается" }
      ]
    }
  ]
}"""


def generate_outline(
    source_text: str,
    modules_count: int,
    lessons_per_module: int,
    course_title_hint: Optional[str] = None,
    tone: str = "official",
    level: str = "novice",
) -> dict[str, Any]:
    """Запрашивает у LLM структуру курса."""
    truncated = source_text[:MAX_SOURCE_CHARS]
    user_prompt = f"""Параметры курса (это ПОТОЛОК, а не обязательная норма):
- Модулей: не более {modules_count}
- Уроков в каждом модуле: не более {lessons_per_module}
- Язык: русский
{f'- Подсказка по названию курса: {course_title_hint}' if course_title_hint else ''}

{_style_directive(tone, level)}

Если материала ниже хватает только на меньшее число уроков — сделай меньше. \
Не растягивай тонкий материал на максимум.

Исходный материал:
\"\"\"
{truncated}
\"\"\"

Составь структуру курса: ровно столько модулей и уроков, сколько реально раскрывает материал, но не больше указанного потолка."""

    return _chat_json(OUTLINE_SYSTEM, user_prompt, temperature=0.4)


# ── 3. Генерация контента отдельного урока ────────────────────────────────────
# Максимум вспомогательных (не-text) блоков на один урок. Держим «сдержанно»:
# в среднем 0–1 доп. блок, текст всегда остаётся основой.
MAX_AUX_BLOCKS_PER_LESSON = 1

LESSON_SYSTEM = """Ты — методист корпоративного обучения. Сгенерируй контент одного урока.

Правила:
- Основа урока — 2-4 ТЕКСТОВЫХ блока. Контент конкретный, без воды.
- В текстовых блоках используй HTML: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>. Не используй <h1>.
- Дополнительно МОЖЕШЬ добавить НЕ БОЛЕЕ ОДНОГО вспомогательного блока и ТОЛЬКО если материал \
урока этого реально требует. Если не требует — не добавляй, это нормально. Не вставляй вспомогательные \
блоки ради разнообразия.
- Вспомогательные блоки на выбор:
  • callout — короткая плашка «важно/совет/внимание». variant: "info" | "warning" | "tip".
  • checklist — список шагов/требований/правил (2-6 пунктов).
  • quiz — один вопрос для самопроверки с вариантами (один верный).
  • open_answer — задание написать развёрнутый ответ своими словами.
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки.

Формат ответа (поля зависят от type):
{
  "blocks": [
    { "type": "text", "content": "<h2>Заголовок</h2><p>Текст...</p>" },
    { "type": "callout", "variant": "warning", "text": "Ключевое предупреждение" },
    { "type": "checklist", "items": ["Шаг 1", "Шаг 2"] },
    { "type": "quiz", "question": "Вопрос?", "options": ["А", "Б", "В"], "correctIndex": 0 },
    { "type": "open_answer", "prompt": "Что проверить перед началом работ?", "criteria": "Упомянуты СИЗ и заземление" }
  ]
}"""


def _normalize_lesson_block(b: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Приводит блок от LLM к {type, content(str)} под наши схемы. None — если мусор."""
    t = b.get("type")

    if t == "text":
        content = b.get("content")
        if isinstance(content, str) and content.strip():
            return {"type": "text", "content": content}
        return None

    if t == "callout":
        text = b.get("text") or b.get("content")
        if not isinstance(text, str) or not text.strip():
            return None
        variant = b.get("variant")
        if variant not in ("info", "warning", "tip"):
            variant = "info"
        return {"type": "callout",
                "content": json.dumps({"variant": variant, "text": text.strip()}, ensure_ascii=False)}

    if t == "checklist":
        items = b.get("items")
        if not isinstance(items, list):
            return None
        items = [str(it).strip() for it in items if str(it).strip()]
        if len(items) < 2:
            return None
        return {"type": "checklist",
                "content": json.dumps({"items": items}, ensure_ascii=False)}

    if t == "quiz":
        question = b.get("question")
        options = b.get("options")
        ci = b.get("correctIndex")
        if not isinstance(question, str) or not question.strip():
            return None
        if not isinstance(options, list) or len(options) < 2:
            return None
        options = [str(o).strip() for o in options if str(o).strip()]
        if len(options) < 2 or not isinstance(ci, int) or not (0 <= ci < len(options)):
            return None
        return {"type": "quiz",
                "content": json.dumps({"question": question.strip(), "options": options,
                                       "correctIndex": ci}, ensure_ascii=False)}

    if t == "open_answer":
        prompt = b.get("prompt") or b.get("content")
        if not isinstance(prompt, str) or not prompt.strip():
            return None
        criteria = b.get("criteria") if isinstance(b.get("criteria"), str) else ""
        return {"type": "open_answer",
                "content": json.dumps({"prompt": prompt.strip(), "criteria": criteria.strip()},
                                      ensure_ascii=False)}

    return None


def generate_lesson_blocks(
    course_title: str,
    module_title: str,
    lesson_title: str,
    lesson_summary: str,
    source_excerpt: str,
    tone: str = "official",
    level: str = "novice",
) -> list[dict[str, Any]]:
    """Генерит массив блоков [{type, content}, ...] для одного урока.

    Текст — основа; вспомогательных (не-text) блоков не больше MAX_AUX_BLOCKS_PER_LESSON.
    """
    user_prompt = f"""Курс: {course_title}
Модуль: {module_title}
Урок: {lesson_title}
Краткое содержание урока: {lesson_summary}

{_style_directive(tone, level)}

Материал курса (используй как источник фактов, не цитируй дословно):
\"\"\"
{source_excerpt[:15_000]}
\"\"\"

Сгенерируй контент урока: 2-4 текстовых блока и, при необходимости, не более одного вспомогательного блока.
"""
    data = _chat_json(LESSON_SYSTEM, user_prompt, temperature=0.6)
    blocks = data.get("blocks", [])
    cleaned: list[dict[str, Any]] = []
    aux_count = 0
    for b in blocks:
        if not isinstance(b, dict):
            continue
        norm = _normalize_lesson_block(b)
        if norm is None:
            continue
        if norm["type"] != "text":
            if aux_count >= MAX_AUX_BLOCKS_PER_LESSON:
                continue  # сдержанность: лишние доп. блоки отбрасываем
            aux_count += 1
        cleaned.append(norm)
    # Урок без текста не имеет смысла — гарантируем хотя бы один текстовый блок
    if not any(c["type"] == "text" for c in cleaned):
        cleaned.insert(0, {"type": "text",
                           "content": f"<p>{lesson_summary or lesson_title}</p>"})
    return cleaned


# ── 3b. Генерация теста модуля ────────────────────────────────────────────────
MODULE_TEST_SYSTEM = """Ты — методист корпоративного обучения. Сгенерируй тест для проверки знаний по целому модулю курса.

Правила:
- Ровно 4 вопроса, каждый охватывает ключевую тему уроков модуля.
- Чередуй ТИПЫ вопросов, чтобы тест не был однообразным:
  • "single" — один верный вариант (поле correctIndex). Это основной тип, делай 2 таких.
  • "boolean" — утверждение «верно/неверно». options строго ["Верно", "Неверно"], correctIndex 0 или 1. Сделай 1 такой.
  • "multiple" — несколько верных вариантов (поле correctIndices — массив индексов). Сделай 1 такой, если материал позволяет; иначе замени на single.
- У single и multiple — по 4 варианта. Индексы считаются с 0.
- НЕ используй типы "short" и "ordering".
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки.

Формат ответа:
{
  "title": "Тест по модулю: [название модуля]",
  "questions": [
    { "type": "single",   "question": "Текст?", "options": ["А","Б","В","Г"], "correctIndex": 0 },
    { "type": "boolean",  "question": "Утверждение верно?", "options": ["Верно","Неверно"], "correctIndex": 0 },
    { "type": "multiple", "question": "Что из перечисленного верно?", "options": ["А","Б","В","Г"], "correctIndices": [0, 2] }
  ]
}"""


def _clean_quiz_question(q: dict[str, Any]) -> Optional[dict[str, Any]]:
    """Нормализует вопрос теста под нашу схему. Поддерживает single/boolean/multiple."""
    if not isinstance(q, dict):
        return None
    question = q.get("question")
    options = q.get("options")
    if not isinstance(question, str) or not question.strip():
        return None
    if not isinstance(options, list) or len(options) < 2:
        return None
    options = [str(o).strip() for o in options if str(o).strip()]
    if len(options) < 2:
        return None

    qtype = q.get("type", "single")
    if qtype not in ("single", "boolean", "multiple"):
        qtype = "single"

    out: dict[str, Any] = {
        "id": q.get("id") if isinstance(q.get("id"), str) else _gen_id(),
        "type": qtype,
        "question": question.strip(),
        "options": options,
    }

    if qtype == "multiple":
        idxs = q.get("correctIndices")
        if not isinstance(idxs, list):
            return None
        idxs = sorted({i for i in idxs if isinstance(i, int) and 0 <= i < len(options)})
        if not idxs:
            return None
        out["correctIndices"] = idxs
        out["correctIndex"] = idxs[0]  # на всякий случай для обратной совместимости
    else:
        ci = q.get("correctIndex")
        if not isinstance(ci, int) or not (0 <= ci < len(options)):
            return None
        out["correctIndex"] = ci

    return out


def generate_module_test(
    course_title: str,
    module_title: str,
    lesson_summaries: list[str],
    source_excerpt: str,
    tone: str = "official",
    level: str = "novice",
) -> dict[str, Any]:
    """Генерит тест для модуля: title + questions."""
    lessons_text = "\n".join(f"- {s}" for s in lesson_summaries if s)
    user_prompt = f"""Курс: {course_title}
Модуль: {module_title}
Уроки модуля:
{lessons_text or '(нет описания уроков)'}

{_style_directive(tone, level)}

Материал (используй как источник фактов):
\"\"\"
{source_excerpt[:8_000]}
\"\"\"

Сгенерируй тест по этому модулю: ровно 4 вопроса, чередуя типы (single, boolean, multiple).
"""
    return _chat_json(MODULE_TEST_SYSTEM, user_prompt, temperature=0.5)


# ── 3c. Генерация итогового теста по всему курсу ──────────────────────────────
FINAL_TEST_SYSTEM = """Ты — методист корпоративного обучения. Сгенерируй ИТОГОВЫЙ тест по ВСЕМУ курсу.

Правила:
- 6 вопросов, охватывающих РАЗНЫЕ модули курса (не зацикливайся на одной теме).
- Итоговый тест проверяет усвоение курса целиком — бери ключевые, важные факты.
- Чередуй типы вопросов, чтобы тест не был однообразным:
  • "single" — один верный вариант (correctIndex). Основной тип, сделай 3 таких.
  • "boolean" — «верно/неверно». options ["Верно", "Неверно"], correctIndex 0 или 1. Сделай 1-2 таких.
  • "multiple" — несколько верных (correctIndices — массив индексов). Сделай 1-2 таких, если материал позволяет.
- У single и multiple — по 4 варианта. Индексы с 0. НЕ используй типы "short" и "ordering".
- Отвечай ТОЛЬКО валидным JSON без markdown-обёртки.

Формат ответа:
{
  "title": "Итоговый тест по курсу: [название]",
  "questions": [
    { "type": "single",   "question": "Текст?", "options": ["А","Б","В","Г"], "correctIndex": 0 },
    { "type": "boolean",  "question": "Утверждение?", "options": ["Верно","Неверно"], "correctIndex": 1 },
    { "type": "multiple", "question": "Что верно?", "options": ["А","Б","В","Г"], "correctIndices": [0, 2] }
  ]
}"""


def generate_final_test(
    course_title: str,
    course_overview: str,
    source_excerpt: str,
    tone: str = "official",
    level: str = "novice",
) -> dict[str, Any]:
    """Генерит итоговый тест по всему курсу: title + questions (6 вопросов, микс типов)."""
    user_prompt = f"""Курс: {course_title}
Структура курса (модули и темы уроков):
{course_overview or '(структура не указана)'}

{_style_directive(tone, level)}

Материал курса (используй как источник фактов):
\"\"\"
{source_excerpt[:10_000]}
\"\"\"

Сгенерируй ИТОГОВЫЙ тест по всему курсу: 6 вопросов, охватывающих разные модули, чередуя типы (single, boolean, multiple).
"""
    return _chat_json(FINAL_TEST_SYSTEM, user_prompt, temperature=0.5)


# ── 4. Сборка итогового payload под CourseCreate ──────────────────────────────
def _gen_id() -> str:
    return uuid.uuid4().hex[:11]


def build_course_payload(
    outline: dict[str, Any],
    source_text: str,
    include_quiz: bool,
    on_progress: Optional[Callable[[int, int, str], None]] = None,
    tone: str = "official",
    level: str = "novice",
    include_final_test: bool = False,
) -> dict[str, Any]:
    """Превращает outline + параллельно сгенерированный контент уроков в payload CourseCreate."""
    course_title = outline.get("title", "Сгенерированный курс")
    course_desc = outline.get("description", "")
    course_id = _gen_id()

    # Плоский список уроков для параллельной генерации
    flat_lessons: list[dict[str, Any]] = []
    # Список модулей для генерации тестов (если include_quiz)
    flat_modules: list[dict[str, Any]] = []

    for mi, mod in enumerate(outline.get("modules", [])):
        mod_id = _gen_id()
        mod_title = mod.get("title", f"Модуль {mi+1}")
        lessons_in_mod = mod.get("lessons", [])
        for li, les in enumerate(lessons_in_mod):
            flat_lessons.append({
                "mi": mi, "li": li,
                "mod_id": mod_id,
                "mod_title": mod_title,
                "les_id": _gen_id(),
                "title": les.get("title", f"Урок {li+1}"),
                "summary": les.get("summary", ""),
            })
        if include_quiz:
            flat_modules.append({
                "mi": mi,
                "mod_id": mod_id,
                "mod_title": mod_title,
                "summaries": [les.get("summary", "") for les in lessons_in_mod],
            })

    total_lessons = len(flat_lessons)
    total_tests = len(flat_modules)
    total = total_lessons + total_tests + (1 if include_final_test else 0)
    log.info(f"[generation] Генерим {total_lessons} уроков + {total_tests} тестов модулей"
             f"{' + итоговый тест' if include_final_test else ''}")

    # Потокобезопасный счётчик прогресса
    _done = 0
    _lock = threading.Lock()

    def _notify(message: str) -> None:
        nonlocal _done
        with _lock:
            _done += 1
            current = _done
        log.info(f"[generation] [{current}/{total}] {message}")
        if on_progress:
            on_progress(current, total, message)

    def _gen_lesson(item: dict[str, Any]) -> dict[str, Any]:
        log.info(f"[generation] → урок «{item['title']}»")
        try:
            blocks_raw = generate_lesson_blocks(
                course_title=course_title,
                module_title=item["mod_title"],
                lesson_title=item["title"],
                lesson_summary=item["summary"],
                source_excerpt=source_text,
                tone=tone,
                level=level,
            )
        except Exception as e:
            log.error(f"[generation] ✗ урок «{item['title']}»: {e}")
            blocks_raw = [
                {"type": "text", "content": f"<p><em>Не удалось сгенерировать контент: {e}</em></p>"}
            ]
        item["blocks"] = blocks_raw
        item["_idx"] = item["mi"] * 100 + item["li"]
        _notify(f"Урок «{item['title']}»")
        return item

    def _gen_test(item: dict[str, Any]) -> dict[str, Any]:
        log.info(f"[generation] → тест модуля «{item['mod_title']}»")
        try:
            raw = generate_module_test(
                course_title=course_title,
                module_title=item["mod_title"],
                lesson_summaries=item["summaries"],
                source_excerpt=source_text,
                tone=tone,
                level=level,
            )
            questions = raw.get("questions", [])
            cleaned_qs = [cq for cq in (_clean_quiz_question(q) for q in questions) if cq]
            item["test_title"] = raw.get("title", f"Тест по модулю: {item['mod_title']}")
            item["test_questions"] = cleaned_qs
        except Exception as e:
            log.error(f"[generation] ✗ тест «{item['mod_title']}»: {e}")
            item["test_title"] = f"Тест по модулю: {item['mod_title']}"
            item["test_questions"] = []
        _notify(f"Тест модуля «{item['mod_title']}»")
        return item

    with ThreadPoolExecutor(max_workers=5) as ex:
        lesson_results = list(ex.map(_gen_lesson, flat_lessons))
        test_results = list(ex.map(_gen_test, flat_modules)) if flat_modules else []

    # Индекс тестов по номеру модуля
    tests_by_mi: dict[int, dict[str, Any]] = {r["mi"]: r for r in test_results}

    # Группируем по модулям
    modules_map: dict[int, dict[str, Any]] = {}
    for mi, mod in enumerate(outline.get("modules", [])):
        mod_id = next((r["mod_id"] for r in lesson_results if r["mi"] == mi), _gen_id())
        tests_payload: list[dict[str, Any]] = []
        if mi in tests_by_mi:
            tr = tests_by_mi[mi]
            tests_payload = [{
                "id": _gen_id(),
                "type": "module",
                "title": tr["test_title"],
                "content": json.dumps({
                    "questions": tr["test_questions"],
                    "pass_threshold": 70,
                }, ensure_ascii=False),
                "order": 0,
            }]
        modules_map[mi] = {
            "id": mod_id,
            "title": mod.get("title", f"Модуль {mi+1}"),
            "order": mi,
            "lessons": [],
            "tests": tests_payload,
        }

    for r in sorted(lesson_results, key=lambda x: x["_idx"]):
        blocks_payload = [
            {"id": _gen_id(), "type": b["type"], "content": b["content"], "order": bi}
            for bi, b in enumerate(r["blocks"])
        ]
        modules_map[r["mi"]]["lessons"].append({
            "id": r["les_id"],
            "title": r["title"],
            "type": "text",
            "duration": "15 мин",
            "order": r["li"],
            "blocks": blocks_payload,
        })

    modules_payload = [modules_map[mi] for mi in sorted(modules_map.keys())]

    # ── Итоговый тест по всему курсу ──────────────────────────────────────────
    # Живёт в служебном модуле '__root__' (order 9999), как в конструкторе.
    if include_final_test:
        log.info("[generation] → итоговый тест по курсу")
        overview_lines: list[str] = []
        for mod in outline.get("modules", []):
            overview_lines.append(f"Модуль: {mod.get('title', '')}")
            for les in mod.get("lessons", []):
                overview_lines.append(f"  • {les.get('title', '')} — {les.get('summary', '')}")
        course_overview = "\n".join(overview_lines)

        try:
            final_raw = generate_final_test(
                course_title=course_title,
                course_overview=course_overview,
                source_excerpt=source_text,
                tone=tone,
                level=level,
            )
            final_qs = [cq for cq in (_clean_quiz_question(q)
                                      for q in final_raw.get("questions", [])) if cq]
            final_title = final_raw.get("title", f"Итоговый тест по курсу: {course_title}")
        except Exception as e:
            log.error(f"[generation] ✗ итоговый тест: {e}")
            final_qs = []
            final_title = f"Итоговый тест по курсу: {course_title}"
        _notify("Итоговый тест")

        # Добавляем, только если есть хотя бы один валидный вопрос
        if final_qs:
            modules_payload.append({
                "id": _gen_id(),
                "title": "__root__",
                "order": 9999,
                "lessons": [],
                "tests": [{
                    "id": _gen_id(),
                    "type": "final",
                    "title": final_title,
                    "content": json.dumps({
                        "questions": final_qs,
                        "pass_threshold": 70,
                    }, ensure_ascii=False),
                    "order": 0,
                }],
            })

    log.info(f"[generation] ✓ Все {total_lessons} уроков и {total_tests} тестов готовы"
             f"{' + итоговый тест' if include_final_test else ''}")

    return {
        "id": course_id,
        "title": course_title,
        "description": course_desc,
        "modules": modules_payload,
    }