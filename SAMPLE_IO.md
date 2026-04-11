# NeuroTrade AI — Sample Input / Output Examples

---

## Agent 1: Polymarket Trader Search

**Request**
```bash
curl -X POST http://localhost:8000/api/agents/polymarket/search \
  -H "Content-Type: application/json" \
  -d '{"limit": 5, "min_win_rate": 0.60}'
```

**Response**
```json
{
  "success": true,
  "platform": "polymarket",
  "data": {
    "traders": [
      {
        "address": "0xa3f8b2c14d9e7f0c2a1b3d8e5f6c9a2b",
        "win_rate": 0.741,
        "total_trades": 87,
        "total_volume": 42350.00,
        "estimated_profit": 1284.50,
        "markets_count": 23,
        "platform": "polymarket",
        "score": 92.34
      },
      {
        "address": "0x7b1c4e2a9f3d0e8b5c6a1f2d4e7c8b9a",
        "win_rate": 0.698,
        "total_trades": 64,
        "total_volume": 28900.00,
        "estimated_profit": 867.00,
        "markets_count": 18,
        "platform": "polymarket",
        "score": 71.18
      }
    ],
    "narrative": "The top Polymarket trader shows a 74.1% win rate across 87 trades with $42k volume — strong copy-trading candidate. Trader #2 maintains 69.8% accuracy with consistent activity across 18 markets. Both are concentrated in political and economic markets, suggesting domain expertise.",
    "metadata": {
      "markets_scanned": 50,
      "trades_analysed": 1240,
      "timestamp": "2025-01-15T14:32:00Z"
    }
  }
}
```

---

## Agent 2: Kalshi Trader Search

**Request**
```bash
curl -X POST http://localhost:8000/api/agents/kalshi/search \
  -H "Content-Type: application/json" \
  -d '{"limit": 3, "min_win_rate": 0.65}'
```

**Response**
```json
{
  "success": true,
  "platform": "kalshi",
  "data": {
    "traders": [
      {
        "user_id": "kalshi_user_a1b2c3d4",
        "win_rate": 0.783,
        "total_trades": 52,
        "total_volume": 18400.00,
        "estimated_profit": 460.00,
        "markets_count": 14,
        "platform": "kalshi",
        "score": 84.71
      }
    ],
    "narrative": "Top Kalshi trader achieves 78.3% win rate across 52 regulated event contracts. Heavy focus on economic indicators and Fed rate decisions suggests macroeconomic expertise.",
    "metadata": {
      "markets_scanned": 30,
      "trades_analysed": 640,
      "timestamp": "2025-01-15T14:32:05Z"
    }
  }
}
```

---

## Agent 3: Niche Mapper

**Request**
```bash
curl -X POST http://localhost:8000/api/agents/niche/map \
  -H "Content-Type: application/json" \
  -d '{
    "traders": [
      {"address": "0xa3f8b2c14d", "win_rate": 0.741, "total_trades": 87, "platform": "polymarket"},
      {"address": "0x7b1c4e2a9f", "win_rate": 0.698, "total_trades": 64, "platform": "polymarket"}
    ]
  }'
```

**Response**
```json
{
  "success": true,
  "data": {
    "niches": {
      "Politics": [
        {
          "address": "0xa3f8b2c14d",
          "win_rate": 0.741,
          "niche": "Politics",
          "confidence": 0.88,
          "reasoning": "High trade volume in election and policy markets with consistent YES positions on incumbent outcomes."
        }
      ],
      "Economics": [
        {
          "address": "0x7b1c4e2a9f",
          "win_rate": 0.698,
          "niche": "Economics",
          "confidence": 0.79,
          "reasoning": "Concentrated trading on Fed decisions, CPI reports, and GDP release markets."
        }
      ]
    },
    "niche_counts": { "Politics": 1, "Economics": 1 },
    "summary": "Politics shows the strongest copy-trading signal with 88% classification confidence. Economics traders demonstrate strong macro domain expertise."
  }
}
```

---

## Agent 4: Apify Event Enrichment

**Request**
```bash
curl -X POST http://localhost:8000/api/agents/apify/enrich \
  -H "Content-Type: application/json" \
  -d '{"event_title": "Will the Fed cut rates before June 2025?"}'
```

**Response**
```json
{
  "success": true,
  "data": {
    "event_title": "Will the Fed cut rates before June 2025?",
    "doc_id": "will_the_fed_cut_rates_before_jun",
    "sources_used": 8,
    "rag_stored": true,
    "facts": {
      "summary": "Fed officials have signalled caution amid persistent inflation. CME FedWatch shows 38% probability of a May cut. Several FOMC members have publicly stated rates will remain higher for longer.",
      "sentiment": "negative",
      "key_facts": [
        "CME FedWatch tool shows 38% probability of cut before June 2025.",
        "Fed Chair Powell indicated no rush to cut in recent testimony.",
        "Core PCE remains above 2.5% target as of latest reading.",
        "Goldman Sachs revised forecast — now expects first cut in Q3 2025.",
        "Prediction market volume on 'NO' side has increased 47% in 72 hours."
      ],
      "probability_hint": "likely NO"
    },
    "timestamp": "2025-01-15T14:33:00Z"
  }
}
```

---

## Agent 5: Chat

**Request**
```bash
curl -X POST http://localhost:8000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Which trader should I copy trade right now?",
    "context": {
      "traders": [
        {"address": "0xa3f8...", "win_rate": 0.741, "niche": "Politics", "score": 92.34}
      ]
    },
    "history": []
  }'
```

**Response**
```json
{
  "success": true,
  "data": {
    "response": "Based on current data, **0xa3f8…** is your strongest copy-trade candidate:\n\n• **Win rate**: 74.1% across 87 trades — statistically significant sample\n• **Niche**: Politics (88% classification confidence)\n• **ELO Score**: 92.34 — top tier\n• **Volume**: $42k — serious skin in the game\n\n**Recommendation**: Copy this trader on political/election markets. Set position sizing at 5-10% of your bankroll per trade. Monitor the Fed rate decision markets separately as that's a different niche.\n\nWant me to enrich any specific upcoming event they might be trading?",
    "rag_docs_used": 2,
    "timestamp": "2025-01-15T14:34:00Z"
  }
}
```

---

## Agent 6: Learning Loop

**Record Outcome**
```bash
curl -X POST http://localhost:8000/api/agents/learning/record \
  -H "Content-Type: application/json" \
  -d '{
    "trade_id": "trade_0042",
    "outcome": "YES",
    "predicted": "YES",
    "metadata": {"trader_id": "0xa3f8b2c14d", "niche": "Politics", "platform": "polymarket"}
  }'
```

**Response**
```json
{
  "success": true,
  "data": {
    "recorded": true,
    "is_correct": true,
    "trader_score": {
      "trader_id": "0xa3f8b2c14d",
      "reliability_score": 1156.4,
      "win_rate": 0.762,
      "trades_recorded": 13,
      "niche": "Politics"
    },
    "total_records": 61
  }
}
```

**Get Insights**
```bash
curl http://localhost:8000/api/agents/learning/insights
```

**Response**
```json
{
  "success": true,
  "data": {
    "overall_accuracy": 0.672,
    "recent_accuracy": 0.742,
    "total_trades": 61,
    "improving": true,
    "niche_accuracy": {
      "Politics": 0.724,
      "Crypto": 0.681,
      "Sports/NBA": 0.612,
      "Economics": 0.592,
      "Weather": 0.551
    },
    "top_traders": [
      { "trader_id": "0xa3f8b2c14d", "reliability_score": 1156.4, "win_rate": 0.762, "trades_recorded": 13, "niche": "Politics" }
    ],
    "narrative": "1. Concentrate copy-trading on Politics (72.4%) and Crypto (68.1%) markets where accuracy is highest. 2. Reduce exposure to Weather and Economics markets until more data is collected. 3. Trader 0xa3f8… has the highest ELO score (1156) — prioritise following their positions.",
    "improving": true
  }
}
```

---

## Full Pipeline

```bash
curl -X POST http://localhost:8000/api/pipeline/run
```

**Response**
```json
{
  "success": true,
  "summary": {
    "polymarket_traders": 14,
    "kalshi_traders": 11,
    "niches_found": 7,
    "timestamp": "2025-01-15T14:35:00Z"
  },
  "data": { "polymarket": {...}, "kalshi": {...}, "niches": {...} }
}
```
