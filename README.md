# NeuroTrade AI

**Prediction Market Intelligence Platform** — discovers consistent traders on Polymarket & Kalshi, maps them to niches, enriches event research via Apify scraping, provides an AI chat interface, and runs a closed learning loop for continuous improvement.

---

## Architecture

```
neurotrade-ai/
├── backend/               # Python FastAPI — 6 agents
│   ├── agents/
│   │   ├── polymarket_agent.py      # Agent 1: Polymarket trader discovery
│   │   ├── kalshi_agent.py          # Agent 2: Kalshi trader discovery
│   │   ├── niche_mapper_agent.py    # Agent 3: LLM-based niche classification
│   │   ├── apify_agent.py           # Agent 4: Apify web scraping + RAG store
│   │   ├── chat_agent.py            # Agent 5: Streaming chat with context
│   │   └── learning_loop_agent.py   # Agent 6: ELO-based closed learning loop
│   ├── utils/
│   │   ├── llm_client.py            # OpenRouter LLM client (streaming + single-shot)
│   │   └── logger.py                # Centralised logging
│   ├── main.py                      # FastAPI app with all routes
│   └── requirements.txt
└── frontend/              # Next.js 14 — deployed on Vercel
    └── src/
        ├── app/                     # App router pages
        ├── components/              # Dashboard, TradersPanel, ChatPanel, etc.
        └── lib/api.ts               # API client with streaming support
```

---

## Agent Overview

| # | Agent | Platform | Description |
|---|-------|----------|-------------|
| 1 | PolymarketAgent | Polymarket CLOB API | Scans active markets, scores wallets by win-rate + volume |
| 2 | KalshiAgent | Kalshi REST API v2 | Same as above for Kalshi |
| 3 | NicheMapperAgent | OpenRouter LLM | Classifies traders into NBA / Politics / Crypto / Weather etc. |
| 4 | ApifyEnrichmentAgent | Apify Google Scraper | Web-scrapes event data, extracts facts, stores in RAG |
| 5 | ChatAgent | OpenRouter LLM | Streaming chat about traders + enriched context |
| 6 | LearningLoopAgent | Internal ELO engine | Records outcomes, updates reliability scores, generates insights |

---

## Quick Start

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Fill in OPENROUTER_API_KEY and APIFY_API_TOKEN

python main.py
# API live at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
# App at http://localhost:3000
```

---

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Set root directory: `frontend`
4. Add env var: `NEXT_PUBLIC_API_URL=<your_backend_url>`
5. Deploy

### Backend → Railway (recommended)

```bash
# In railway.app: New Project → Deploy from GitHub
# Set root: backend/
# Add env vars from .env.example
# Railway auto-detects requirements.txt and runs uvicorn
```

Or use Render / Fly.io — any platform supporting Python.

---

## API Reference

### `POST /api/agents/polymarket/search`
```json
{ "limit": 20, "min_win_rate": 0.55 }
```

### `POST /api/agents/kalshi/search`
```json
{ "limit": 20, "min_win_rate": 0.55 }
```

### `POST /api/agents/niche/map`
```json
{ "traders": [...] }
```

### `POST /api/agents/apify/enrich`
```json
{ "event_title": "Will the Fed cut rates in 2025?" }
```

### `POST /api/agents/chat`
```json
{ "message": "Which trader should I copy?", "history": [] }
```

### `POST /api/agents/chat/stream`
Server-sent events stream.

### `POST /api/agents/learning/record`
```json
{ "trade_id": "t001", "outcome": "YES", "predicted": "YES", "metadata": { "trader_id": "0xabc", "niche": "Politics" } }
```

### `GET /api/agents/learning/insights`

### `POST /api/pipeline/run`
Runs all agents sequentially.

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | ✅ | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `OPENROUTER_MODEL` | optional | Default: `meta-llama/llama-3.1-8b-instruct:free` |
| `APIFY_API_TOKEN` | ✅ | [apify.com](https://apify.com) — free tier available |
| `KALSHI_API_TOKEN` | optional | Public markets work without it |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend URL |

---

## LLM Provider

Uses **OpenRouter** with free models. Default: `meta-llama/llama-3.1-8b-instruct:free`

Other free options on OpenRouter:
- `google/gemma-2-9b-it:free`
- `mistralai/mistral-7b-instruct:free`
- `qwen/qwen-2-7b-instruct:free`

Change via `OPENROUTER_MODEL` env var.

---

## Closed Learning Loop

The learning loop (Agent 6) implements a Hermes-style feedback mechanism:

1. **Predict** — agents recommend traders to copy
2. **Execute** — user places copy trades
3. **Observe** — record actual outcome via `/api/agents/learning/record`
4. **Update** — ELO-like algorithm adjusts each trader's `reliability_score`
5. **Improve** — next recommendations weighted by updated scores
6. **Analyse** — LLM generates actionable insights from performance data
