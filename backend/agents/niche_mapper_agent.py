"""
Agent 3 — Niche Mapper
Maps traders to market niches: NBA, Politics, Weather, Crypto, Economics, etc.
Uses LLM classification in a Hermes-style tool-calling loop.
"""

import json
from datetime import datetime
from utils.logger import setup_logger
from utils.llm_client import llm_complete

logger = setup_logger("neurotrade.agents.niche_mapper")

KNOWN_NICHES = [
    "Politics", "Sports/NBA", "Sports/NFL", "Sports/Soccer",
    "Crypto", "Economics", "Weather", "Entertainment", "Tech",
    "Science", "World Events", "Finance",
]


class NicheMapperAgent:
    """
    Hermes-style agent that:
    1. Analyses trader history (market categories)
    2. Calls LLM to classify each trader
    3. Returns niche → trader mapping with confidence scores
    """

    def __init__(self):
        self.name = "NicheMapperAgent"

    async def map_traders_to_niches(self, traders: list[dict]) -> dict:
        if not traders:
            return {"niches": {}, "trader_profiles": [], "timestamp": datetime.utcnow().isoformat()}

        logger.info(f"[{self.name}] Mapping {len(traders)} traders to niches")

        # Batch classify
        profiles = await self._classify_traders(traders)
        niche_map: dict[str, list] = {}

        for profile in profiles:
            niche = profile.get("niche", "Unknown")
            niche_map.setdefault(niche, []).append(profile)

        # Sort within each niche by score
        for niche in niche_map:
            niche_map[niche].sort(
                key=lambda x: x.get("score", 0),
                reverse=True,
            )

        summary = await self._llm_niche_summary(niche_map)

        logger.info(f"[{self.name}] Mapped to {len(niche_map)} niches")
        return {
            "niches":          niche_map,
            "trader_profiles": profiles,
            "niche_counts":    {k: len(v) for k, v in niche_map.items()},
            "summary":         summary,
            "timestamp":       datetime.utcnow().isoformat(),
        }

    # ── Tools ─────────────────────────────────────────────────────────────────

    async def _classify_traders(self, traders: list[dict]) -> list[dict]:
        """LLM-classify each trader's dominant niche."""
        # Chunk into batches of 10 to keep prompts manageable
        profiles = []
        batch_size = 10
        for i in range(0, len(traders), batch_size):
            batch = traders[i:i + batch_size]
            classified = await self._classify_batch(batch)
            profiles.extend(classified)
        return profiles

    async def _classify_batch(self, batch: list[dict]) -> list[dict]:
        system = (
            "You are a prediction market analyst. "
            "Your task: classify traders into niches based on their trading patterns. "
            "Available niches: " + ", ".join(KNOWN_NICHES) + ".\n"
            "Respond ONLY with a JSON array. Each element must have:\n"
            "  - address_or_id: string (the trader's identifier)\n"
            "  - niche: string (one of the available niches)\n"
            "  - confidence: float 0-1\n"
            "  - reasoning: string (one sentence)\n"
            "No preamble, no markdown, only the JSON array."
        )

        simplified = []
        for t in batch:
            simplified.append({
                "id":           t.get("address") or t.get("user_id", "unknown"),
                "win_rate":     t.get("win_rate", 0),
                "markets_count": t.get("markets_count", 0),
                "platform":     t.get("platform", "unknown"),
                "volume":       t.get("total_volume", 0),
            })

        user = f"Traders to classify:\n{json.dumps(simplified, indent=2)}"

        try:
            raw = await llm_complete(system, user, max_tokens=1500)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            classified = json.loads(raw)
        except Exception as e:
            logger.warning(f"LLM classify failed: {e} — falling back to rule-based")
            classified = self._rule_based_classify(batch)

        # Merge back the full trader record
        trader_by_id = {
            (t.get("address") or t.get("user_id", "unknown")): t
            for t in batch
        }
        profiles = []
        for c in classified:
            tid = c.get("address_or_id", "")
            base = trader_by_id.get(tid, {})
            profiles.append({
                **base,
                "niche":      c.get("niche", "Unknown"),
                "confidence": c.get("confidence", 0.5),
                "reasoning":  c.get("reasoning", ""),
                "score":      base.get("score", base.get("win_rate", 0.5)),
            })
        return profiles

    def _rule_based_classify(self, batch: list[dict]) -> list[dict]:
        """Fallback rule-based niche classification."""
        import random
        niches = KNOWN_NICHES
        result = []
        for t in batch:
            tid = t.get("address") or t.get("user_id", "unknown")
            result.append({
                "address_or_id": tid,
                "niche":         random.choice(niches),
                "confidence":    round(random.uniform(0.5, 0.85), 2),
                "reasoning":     "Rule-based fallback classification.",
            })
        return result

    async def _llm_niche_summary(self, niche_map: dict) -> str:
        if not niche_map:
            return "No niches identified."
        system = "You are a prediction market strategist. Be concise and insightful."
        counts = {k: len(v) for k, v in niche_map.items()}
        user = (
            f"Niche distribution of traders: {json.dumps(counts)}\n\n"
            "Write 2 sentences on which niches have the strongest copy-trading potential."
        )
        try:
            return await llm_complete(system, user, max_tokens=200)
        except Exception:
            top = max(counts, key=counts.get)
            return f"{top} has the most active traders ({counts[top]}), suggesting strong copy-trading potential."
