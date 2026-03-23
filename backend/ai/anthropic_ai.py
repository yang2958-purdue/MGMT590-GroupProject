"""
Anthropic Claude AI provider. Uses API key from config.
"""
from anthropic import Anthropic


class AnthropicAI:
    def __init__(self, config: dict):
        api_key = config.get("anthropic_api_key") or ""
        if not api_key:
            raise ValueError("anthropic_api_key required")
        self._client = Anthropic(api_key=api_key.strip())

    def complete(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        if not response.content:
            return ""
        block = response.content[0]
        return getattr(block, "text", str(block)) if block else ""
