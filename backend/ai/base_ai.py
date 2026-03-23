"""Base AI protocol."""

from typing import Protocol


class BaseAI(Protocol):
    def complete(self, system_prompt: str, user_prompt: str) -> str: ...
