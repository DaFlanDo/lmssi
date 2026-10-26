"""
Демо-режим публичного стенда (DEMO_MODE=1).

Посетитель входит одной кнопкой под одним из сид-аккаунтов (seed_demo.py),
без пароля. Аккаунты общие, поэтому:
- их нельзя удалить, деактивировать, сменить им пароль или роль;
- ИИ-вызовы под ними ограничены по частоте — ключ платный и общий;
- раз в сутки reset_demo.py возвращает базу к исходным данным.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException

from app.config import get_settings
from app.models.user import User

# Роль на кнопке → сид-аккаунт
DEMO_ACCOUNTS: dict[str, str] = {
    "student": "a.sidorov@nordbyte.dev",
    "hr": "hr@nordbyte.dev",
    "admin": "admin@nordbyte.dev",
}
DEMO_EMAILS = frozenset(DEMO_ACCOUNTS.values())

# Сколько ИИ-запросов в час разрешено всем демо-посетителям вместе
AI_LIMITS_PER_HOUR: dict[str, int] = {
    "generate": 6,     # генерация курса — самая дорогая
    "assistant": 60,   # ИИ-наставник в уроке
    "evaluate": 60,    # проверка развёрнутого ответа
}


def demo_enabled() -> bool:
    return get_settings().demo_mode


def is_demo_user(user: User | None) -> bool:
    return demo_enabled() and user is not None and user.email in DEMO_EMAILS


def forbid_for_demo(user: User | None, action: str) -> None:
    """403, если действие направлено на общий демо-аккаунт."""
    if is_demo_user(user):
        raise HTTPException(403, f"В демо-режиме нельзя {action}")


_ai_calls: dict[str, deque[float]] = defaultdict(deque)
_ai_lock = threading.Lock()


def check_ai_quota(user: User, kind: str) -> None:
    """Скользящее окно в час на все демо-аккаунты сразу. Обычных пользователей не трогает."""
    if not is_demo_user(user):
        return
    limit = AI_LIMITS_PER_HOUR[kind]
    now = time.monotonic()
    with _ai_lock:
        calls = _ai_calls[kind]
        while calls and now - calls[0] > 3600:
            calls.popleft()
        if len(calls) >= limit:
            raise HTTPException(
                429,
                "Демо-стенд: лимит ИИ-запросов на этот час исчерпан. "
                "Попробуйте позже или запустите проект у себя (docker compose up)",
            )
        calls.append(now)


def reset_ai_quota() -> None:
    with _ai_lock:
        _ai_calls.clear()
