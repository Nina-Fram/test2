from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class Agent:
    """
    Простейший "агент": хранит имя, историю сообщений и может отвечать
    детерминированным образом (без LLM).
    """

    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = "agent"
    created_at: str = field(default_factory=_utc_now_iso)
    messages: list[dict[str, str]] = field(default_factory=list)

    def say(self, text: str) -> str:
        """
        Принимает текст пользователя, добавляет в историю и возвращает ответ.
        """
        text = (text or "").strip()
        self.messages.append({"role": "user", "text": text})

        # Минимальная "логика": отражаем сообщение и добавляем подпись агента.
        reply = f"{self.name}: я получил сообщение: {text}"
        self.messages.append({"role": "agent", "text": reply})
        return reply

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "created_at": self.created_at,
            "messages": list(self.messages),
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Agent":
        return cls(
            id=str(data.get("id") or str(uuid4())),
            name=str(data.get("name") or "agent"),
            created_at=str(data.get("created_at") or _utc_now_iso()),
            messages=list(data.get("messages") or []),
        )
