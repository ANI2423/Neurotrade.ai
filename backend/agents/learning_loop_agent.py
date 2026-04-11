"""
Agent 6 — Closed Learning Loop (Hermes Built-in Functionality)
Records trade outcomes, updates trader scores, generates performance insights.
Implements feedback loop: predict → observe → update → improve.
"""

import json
import math
from datetime import datetime, timedelta
from collections import defaultdict
from utils.logger import setup_logger
from utils.llm_client import llm_complete

logger = setup_logger("neurotrade.agents.learning_loop")

# In-memory store (replace with DB in production)
_OUTCOMES:       list[dict]      = []
_TRADER_SCORES:  dict[str, dict] = {}
_MODEL_ACCURACY: list[dict]      = []


class LearningLoopAgent:
    """
    Hermes Closed Learning Loop:
    1. Record trade outcomes (predicted vs actual)
    2. Update trader reliability scores using ELO-like algorithm
    3. Generate actionable insights via LLM
    4. Expose performance metrics dashboard
    """

    def __init__(self):
        self.name = "LearningLoopAgent"
        self._seed_mock_data()

    # ── Public API ────────────────────────────────────────────────────────────

    async def record_outcome(
        self,
        trade_id: str,
        outcome: str,
        predicted: str,
        metadata: dict,
    ) -> dict:
        """Record a trade outcome and update the learning loop."""
        logger.info(f"[{self.name}] Recording outcome: trade={trade_id} predicted={predicted} actual={outcome}")

        is_correct = outcome.lower() == predicted.lower()
        trader_id  = metadata.get("trader_id", "unknown")

        record = {
            "trade_id":   trade_id,
            "trader_id":  trader_id,
            "predicted":  predicted,
            "outcome":    outcome,
            "correct":    is_correct,
            "platform":   metadata.get("platform", "unknown"),
            "niche":      metadata.get("niche", "unknown"),
            "timestamp":  datetime.utcnow().isoformat(),
            "metadata":   metadata,
        }
        _OUTCOMES.append(record)

        # Update trader score
        self._update_trader_score(trader_id, is_correct, metadata)

        # Log model accuracy
        _MODEL_ACCURACY.append({
            "trade_id":  trade_id,
            "correct":   is_correct,
            "timestamp": record["timestamp"],
        })

        return {
            "recorded":     True,
            "is_correct":   is_correct,
            "trader_score": _TRADER_SCORES.get(trader_id, {}),
            "total_records": len(_OUTCOMES),
        }

    async def get_insights(self) -> dict:
        """Generate learning loop insights."""
        if not _OUTCOMES:
            return self._empty_insights()

        overall_accuracy = sum(1 for o in _OUTCOMES if o["correct"]) / len(_OUTCOMES)

        # Per-niche accuracy
        niche_stats: dict = defaultdict(lambda: {"correct": 0, "total": 0})
        for o in _OUTCOMES:
            n = o.get("niche", "unknown")
            niche_stats[n]["total"]   += 1
            niche_stats[n]["correct"] += int(o["correct"])

        niche_accuracy = {
            k: round(v["correct"] / v["total"], 3)
            for k, v in niche_stats.items() if v["total"] > 0
        }

        # Top traders
        top_traders = sorted(
            _TRADER_SCORES.values(),
            key=lambda x: x.get("reliability_score", 0),
            reverse=True,
        )[:5]

        # Recent trend (last 20 outcomes)
        recent = _OUTCOMES[-20:]
        recent_accuracy = (
            sum(1 for o in recent if o["correct"]) / len(recent)
            if recent else 0
        )

        # LLM insights
        narrative = await self._llm_insights(overall_accuracy, niche_accuracy, top_traders)

        return {
            "overall_accuracy":  round(overall_accuracy, 3),
            "recent_accuracy":   round(recent_accuracy, 3),
            "total_trades":      len(_OUTCOMES),
            "niche_accuracy":    niche_accuracy,
            "top_traders":       top_traders,
            "narrative":         narrative,
            "improving":         recent_accuracy > overall_accuracy,
            "timestamp":         datetime.utcnow().isoformat(),
        }

    # ── Internal ──────────────────────────────────────────────────────────────

    def _update_trader_score(self, trader_id: str, correct: bool, metadata: dict):
        """ELO-like score update."""
        if trader_id not in _TRADER_SCORES:
            _TRADER_SCORES[trader_id] = {
                "trader_id":         trader_id,
                "platform":          metadata.get("platform", "unknown"),
                "reliability_score": 1000.0,  # Starting ELO
                "trades_recorded":   0,
                "correct_count":     0,
                "niche":             metadata.get("niche", "unknown"),
            }

        s = _TRADER_SCORES[trader_id]
        s["trades_recorded"] += 1
        s["correct_count"]   += int(correct)

        # ELO update: K-factor decreases as more trades recorded
        k = max(8, 32 - s["trades_recorded"] // 2)
        expected = 1 / (1 + math.pow(10, (1000 - s["reliability_score"]) / 400))
        actual   = 1.0 if correct else 0.0
        s["reliability_score"] = round(s["reliability_score"] + k * (actual - expected), 2)
        s["win_rate"]          = round(s["correct_count"] / s["trades_recorded"], 3)

    async def _llm_insights(
        self,
        overall_accuracy: float,
        niche_accuracy: dict,
        top_traders: list,
    ) -> str:
        system = (
            "You are a quantitative analyst reviewing a prediction market copy-trading system's performance. "
            "Be concise, data-driven, and actionable."
        )
        user = (
            f"Learning loop stats:\n"
            f"- Overall accuracy: {overall_accuracy:.1%}\n"
            f"- Niche accuracy: {json.dumps(niche_accuracy)}\n"
            f"- Top traders: {json.dumps([{k: v for k, v in t.items() if k != 'trader_id'} for t in top_traders], indent=2)}\n\n"
            "Give 3 actionable insights to improve copy-trading performance."
        )
        try:
            return await llm_complete(system, user, max_tokens=400)
        except Exception:
            best_niche = max(niche_accuracy, key=niche_accuracy.get) if niche_accuracy else "Politics"
            return (
                f"System accuracy is {overall_accuracy:.1%}. "
                f"Focus copy-trading on {best_niche} markets where accuracy is highest. "
                "Increase position sizing on top-rated traders."
            )

    def _empty_insights(self) -> dict:
        return {
            "overall_accuracy": 0,
            "recent_accuracy":  0,
            "total_trades":     0,
            "niche_accuracy":   {},
            "top_traders":      [],
            "narrative":        "No outcomes recorded yet. Run the pipeline to start collecting data.",
            "improving":        False,
            "timestamp":        datetime.utcnow().isoformat(),
        }

    def _seed_mock_data(self):
        """Seed with realistic mock data for demo purposes."""
        import random
        random.seed(42)
        niches    = ["Politics", "Sports/NBA", "Crypto", "Economics", "Weather"]
        platforms = ["polymarket", "kalshi"]
        traders   = [f"trader_{i:03d}" for i in range(12)]

        for i in range(60):
            trader = random.choice(traders)
            niche  = random.choice(niches)
            pred   = random.choice(["YES", "NO"])
            # Better traders win more
            win_prob = 0.72 if traders.index(trader) < 4 else 0.52
            actual = pred if random.random() < win_prob else ("NO" if pred == "YES" else "YES")

            record = {
                "trade_id":  f"mock_{i:04d}",
                "trader_id": trader,
                "predicted": pred,
                "outcome":   actual,
                "correct":   pred == actual,
                "platform":  random.choice(platforms),
                "niche":     niche,
                "timestamp": (datetime.utcnow() - timedelta(days=random.randint(0, 30))).isoformat(),
                "metadata":  {"niche": niche, "platform": random.choice(platforms)},
            }
            _OUTCOMES.append(record)
            self._update_trader_score(trader, pred == actual, {"niche": niche, "platform": random.choice(platforms)})
