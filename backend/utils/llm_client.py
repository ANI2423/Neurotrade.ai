"""
OpenRouter LLM client — used by all NeuroTrade agents.
Model: meta-llama/llama-3.1-8b-instruct:free  (free tier on OpenRouter)
"""

import os
import json
import httpx
from typing import AsyncGenerator
from utils.logger import setup_logger

logger = setup_logger("neurotrade.llm")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE    = "https://openrouter.ai/api/v1"
DEFAULT_MODEL      = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")


async def llm_complete(
    system_prompt: str,
    user_prompt: str,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.3,
    max_tokens: int = 2000,
) -> str:
    """Single-shot LLM completion via OpenRouter."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neurotrade.ai",
        "X-Title": "NeuroTrade AI",
    }
    payload = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def llm_stream(
    system_prompt: str,
    user_prompt: str,
    history: list = None,
    model: str = DEFAULT_MODEL,
    temperature: float = 0.4,
) -> AsyncGenerator[str, None]:
    """Streaming LLM completion via OpenRouter."""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neurotrade.ai",
        "X-Title": "NeuroTrade AI",
    }

    messages = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": model,
        "temperature": temperature,
        "max_tokens": 2000,
        "stream": True,
        "messages": messages,
    }

    async with httpx.AsyncClient(timeout=120) as client:
        async with client.stream(
            "POST",
            f"{OPENROUTER_BASE}/chat/completions",
            headers=headers,
            json=payload,
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    payload_str = line[6:]
                    if payload_str.strip() == "[DONE]":
                        break
                    try:
                        chunk = json.loads(payload_str)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except (json.JSONDecodeError, KeyError):
                        continue
