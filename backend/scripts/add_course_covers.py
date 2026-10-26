"""Генерирует красивые SVG-обложки для курсов без cover_image.

Безопасно: трогает только курсы, у которых обложка не задана и есть название.
Картинки кладутся в settings.upload_dir и раздаются по /static/<file>.

Запуск:  python -m scripts.add_course_covers
"""
from __future__ import annotations

import os
import sys
import uuid

# Чтобы можно было запускать как `python scripts/add_course_covers.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.database import SessionLocal
from app.models import Course

settings = get_settings()

# Палитра градиентов — та же логика, что в CourseCard (по коду первой буквы)
GRADIENTS = [
    ("#1d4ed8", "#3b82f6", "#60a5fa"),
    ("#1e3a8a", "#2563eb", "#7c3aed"),
    ("#0f766e", "#0d9488", "#22d3ee"),
    ("#1e40af", "#0ea5e9", "#38bdf8"),
    ("#312e81", "#4f46e5", "#818cf8"),
    ("#0c4a6e", "#0284c7", "#38bdf8"),
    ("#134e4a", "#059669", "#34d399"),
    ("#1e3a5f", "#1d4ed8", "#93c5fd"),
]

# Категория по ключевым словам в названии
CATEGORY_RULES = [
    (("git", "code review"), "Разработка"),
    (("docker", "ci/cd", "kubernetes"), "DevOps"),
    (("python", "бэкенд", "backend"), "Backend"),
    (("информационная безопасн", "фишинг"), "Инфобезопасность"),
    (("добро пожаловать", "онбординг"), "Онбординг"),
    (("пожар",), "Пожарная безопасность"),
    (("охрана труда", "техника безопасност", "электробезоп"), "Охрана труда"),
    (("электромонт", "электрическ", "схем"), "Электромонтаж"),
    (("санитар", "гигиен"), "Санитария и гигиена"),
    (("хлеб", "пекарн", "выпечк"), "Производство"),
    (("erp", "1с", "система"), "Цифровые системы"),
    (("http", "протокол", "сеть", "api"), "ИТ и сети"),
    (("геноцид", "холокост", "оккупа", "истори"), "История"),
]


def xml_escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def pick_gradient(title: str):
    code = ord(title.strip()[0].upper()) if title.strip() else 65
    return GRADIENTS[code % len(GRADIENTS)]


def pick_category(title: str) -> str:
    low = title.lower()
    for keys, label in CATEGORY_RULES:
        if any(k in low for k in keys):
            return label
    return "Обучение"


def wrap_title(title: str, max_chars: int = 22, max_lines: int = 4) -> list[str]:
    words = title.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        candidate = (cur + " " + w).strip()
        if len(candidate) <= max_chars or not cur:
            cur = candidate
        else:
            lines.append(cur)
            cur = w
        if len(lines) == max_lines:
            break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    # Если не влезло — многоточие на последней строке
    used = sum(len(l.split()) for l in lines)
    if used < len(words) and lines:
        lines[-1] = lines[-1].rstrip(".") + "…"
    return lines


def build_svg(title: str) -> str:
    c1, c2, c3 = pick_gradient(title)
    category = pick_category(title)
    letter = xml_escape(title.strip()[0].upper()) if title.strip() else "?"
    lines = wrap_title(title, max_chars=22, max_lines=4)

    font_size = 92 if len(lines) <= 2 else (78 if len(lines) == 3 else 64)
    line_height = int(font_size * 1.18)
    total_h = line_height * len(lines)
    start_y = 470 - total_h // 2 + font_size  # вертикально по центру нижней зоны

    tspans = "".join(
        f'<text x="120" y="{start_y + i * line_height}" '
        f'font-family="Inter, Segoe UI, Arial, sans-serif" font-size="{font_size}" '
        f'font-weight="800" fill="#ffffff" letter-spacing="-1">{xml_escape(line)}</text>'
        for i, line in enumerate(lines)
    )

    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{c1}"/>
      <stop offset="55%" stop-color="{c2}"/>
      <stop offset="100%" stop-color="{c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx="78%" cy="22%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="70%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#glow)"/>
  <circle cx="1320" cy="200" r="240" fill="#ffffff" opacity="0.06"/>
  <circle cx="1440" cy="700" r="180" fill="#ffffff" opacity="0.05"/>
  <text x="1180" y="860" font-family="Inter, Arial, sans-serif" font-size="640"
        font-weight="900" fill="#ffffff" opacity="0.06" text-anchor="middle">{letter}</text>
  <rect x="120" y="120" rx="26" ry="26" width="{120 + len(category) * 19}" height="58" fill="#ffffff" opacity="0.16"/>
  <text x="150" y="159" font-family="Inter, Arial, sans-serif" font-size="30"
        font-weight="700" fill="#ffffff" letter-spacing="2">{xml_escape(category.upper())}</text>
  {tspans}
</svg>'''


def main() -> None:
    os.makedirs(settings.upload_dir, exist_ok=True)
    db = SessionLocal()
    updated = 0
    skipped = 0
    try:
        courses = db.query(Course).all()
        for c in courses:
            if c.cover_image:
                skipped += 1
                continue
            if not (c.title or "").strip():
                print(f"  пропуск (нет названия): {c.id}")
                skipped += 1
                continue
            svg = build_svg(c.title)
            name = f"cover_{c.id}_{uuid.uuid4().hex[:8]}.svg"
            path = os.path.join(settings.upload_dir, name)
            with open(path, "w", encoding="utf-8") as f:
                f.write(svg)
            c.cover_image = f"/static/{name}"
            updated += 1
            print(f"  + {c.title[:50]:50}  ->  {c.cover_image}")
        db.commit()
    finally:
        db.close()
    print(f"\nГотово. Обновлено: {updated}, пропущено: {skipped}.")


if __name__ == "__main__":
    main()
