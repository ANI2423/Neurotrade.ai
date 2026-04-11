"""
Agent 5 — Chat Agent
Conversational interface to discuss traders, events, and copy-trading strategy.
Queries RAG for relevant context. Supports streaming.
"""

import json
from datetime import datetime
from typing import AsyncGenerator
from utils.logger import setup_logger
from utils.llm_client import llm_complete, llm_stream

logger = setup_logger("neurotrade.agents.chat")

SYSTEM_PROMPT = """You are NeuroTrade AI — an expert prediction market analyst and copy-trading strategist.

You have access to:
- Real-time Polymarket and Kalshi trader performance data
- Market niche classifications
- Enriched event research (via web scraping)
- Historical learning loop data

Your role:
- Help users decide which traders to copy-trade
- Analyse market events and predict outcomes
- Provide data-backed reasoning
- Be concise, direct, and quantitative

Format numbers clearly. Use bullet points for comparisons.
Never hallucinate data — if you don't know, say so and suggest what data to gather.
"""


class ChatAgent:
    """
    Hermes-style conversational agent with RAG retrieval.
    Supports single-shot and streaming modes.
    """

    def __init__(self):
        self.name = "ChatAgent"
        # Lazy import to avoid circular dependencies
        self._apify_agent = None

    def _get_apify_agent(self):
        if self._apify_agent is None:
            from agents.apify_agent import ApifyEnrichmentAgent
            self._apify_agent = ApifyEnrichmentAgent()
        return self._apify_agent

    async def chat(
        self,
        message: str,
        context: dict | None = None,
        history: list | None = None,
    ) -> dict:
        logger.info(f"[{self.name}] Chat message received: {message[:80]}…")

        # Build enriched prompt with RAG context
        system = self._build_system(context)
        hist   = self._format_history(history or [])

        response = await llm_complete(system, message, max_tokens=800)

        return {
            "response":    response,
            "timestamp":   datetime.utcnow().isoformat(),
            "rag_docs_used": len(self._get_apify_agent().get_rag_context(message)),
        }

    async def stream_chat(
        self,
        message: str,
        context: dict | None = None,
        history: list | None = None,
    ) -> AsyncGenerator[str, None]:
        system = self._build_system(context)
        hist   = self._format_history(history or [])

        async for chunk in llm_stream(system, message, history=hist):
            yield chunk

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _build_system(self, context: dict | None) -> str:
        system = SYSTEM_PROMPT
        if not context:
            # Pull RAG docs
            return system

        # Inject context
        parts = [system]
        if "traders" in context:
            traders_json = json.dumps(context["traders"][:5], indent=2)
            parts.append(f"\n\n## Current Trader Data\n```json\n{traders_json}\n```")
        if "niches" in context:
            parts.append(f"\n\n## Niche Distribution\n{json.dumps(context['niches'], indent=2)}")
        if "event" in context:
            parts.append(f"\n\n## Event Research\n{json.dumps(context['event'], indent=2)}")

        return "\n".join(parts)

    def _format_history(self, history: list) -> list[dict]:
        """Convert frontend history format to OpenRouter messages format."""
        formatted = []
        for h in history:
            role    = h.get("role", "user")
            content = h.get("content", "")
            if role in ("user", "assistant") and content:
                formatted.append({"role": role, "content": content})
        return formatted[-10:]  # Keep last 10 turns
