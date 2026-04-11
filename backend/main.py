"""
NeuroTrade AI - Backend API
FastAPI application serving all prediction market agents
"""

import os
import json
import asyncio
import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn

from agents.polymarket_agent import PolymarketAgent
from agents.kalshi_agent import KalshiAgent
from agents.niche_mapper_agent import NicheMapperAgent
from agents.apify_agent import ApifyEnrichmentAgent
from agents.chat_agent import ChatAgent
from agents.learning_loop_agent import LearningLoopAgent
from utils.logger import setup_logger

# ── Setup ──────────────────────────────────────────────────────────────────────
logger = setup_logger("neurotrade.main")

app = FastAPI(
    title="NeuroTrade AI",
    description="Prediction Market Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Agents (initialised once) ──────────────────────────────────────────────────
polymarket_agent = PolymarketAgent()
kalshi_agent     = KalshiAgent()
niche_mapper     = NicheMapperAgent()
apify_agent      = ApifyEnrichmentAgent()
chat_agent       = ChatAgent()
learning_loop    = LearningLoopAgent()

# ── Request / Response models ──────────────────────────────────────────────────

class SearchRequest(BaseModel):
    limit: int = 20
    min_win_rate: float = 0.55

class NicheRequest(BaseModel):
    traders: list[dict]

class EnrichRequest(BaseModel):
    event_title: str
    event_id: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None
    history: Optional[list] = []

class LearningRequest(BaseModel):
    trade_id: str
    outcome: str
    predicted: str
    metadata: Optional[dict] = {}

# ── Health ─────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat(), "service": "NeuroTrade AI"}

# ── Agent endpoints ────────────────────────────────────────────────────────────

@app.post("/api/agents/polymarket/search")
async def search_polymarket(req: SearchRequest):
    """Agent 1 – Find consistent traders on Polymarket."""
    try:
        logger.info(f"Polymarket search: limit={req.limit} min_wr={req.min_win_rate}")
        result = await polymarket_agent.find_consistent_traders(
            limit=req.limit,
            min_win_rate=req.min_win_rate,
        )
        return {"success": True, "platform": "polymarket", "data": result}
    except Exception as e:
        logger.error(f"Polymarket agent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/kalshi/search")
async def search_kalshi(req: SearchRequest):
    """Agent 2 – Find consistent traders on Kalshi."""
    try:
        logger.info(f"Kalshi search: limit={req.limit} min_wr={req.min_win_rate}")
        result = await kalshi_agent.find_consistent_traders(
            limit=req.limit,
            min_win_rate=req.min_win_rate,
        )
        return {"success": True, "platform": "kalshi", "data": result}
    except Exception as e:
        logger.error(f"Kalshi agent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/niche/map")
async def map_niches(req: NicheRequest):
    """Agent 3 – Map traders to niches (NBA / Politics / Weather …)."""
    try:
        logger.info(f"Niche mapping for {len(req.traders)} traders")
        result = await niche_mapper.map_traders_to_niches(req.traders)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Niche mapper error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/apify/enrich")
async def enrich_event(req: EnrichRequest):
    """Agent 4 – Scrape & enrich RAG with event data via Apify."""
    try:
        logger.info(f"Enriching event: {req.event_title}")
        result = await apify_agent.enrich_event(req.event_title, req.event_id)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Apify agent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/chat")
async def chat_with_data(req: ChatRequest):
    """Agent 5 – Chat about traders / events."""
    try:
        result = await chat_agent.chat(req.message, req.context, req.history)
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Chat agent error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/agents/chat/stream")
async def chat_stream(req: ChatRequest):
    """Agent 5 – Streaming chat."""
    async def generator():
        async for chunk in chat_agent.stream_chat(req.message, req.context, req.history):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")


@app.post("/api/agents/learning/record")
async def record_outcome(req: LearningRequest):
    """Agent 6 – Closed learning loop: record trade outcome."""
    try:
        result = await learning_loop.record_outcome(
            req.trade_id, req.outcome, req.predicted, req.metadata
        )
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Learning loop error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/agents/learning/insights")
async def get_insights():
    """Agent 6 – Get learning loop insights & performance metrics."""
    try:
        result = await learning_loop.get_insights()
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Learning insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Aggregated pipeline ────────────────────────────────────────────────────────

@app.post("/api/pipeline/run")
async def run_full_pipeline(background_tasks: BackgroundTasks):
    """Run the full agent pipeline: scrape → map → enrich → learn."""
    try:
        logger.info("Starting full pipeline run")
        poly_traders  = await polymarket_agent.find_consistent_traders(limit=20)
        kalshi_traders = await kalshi_agent.find_consistent_traders(limit=20)
        all_traders   = poly_traders.get("traders", []) + kalshi_traders.get("traders", [])
        mapped        = await niche_mapper.map_traders_to_niches(all_traders)
        return {
            "success": True,
            "summary": {
                "polymarket_traders": len(poly_traders.get("traders", [])),
                "kalshi_traders":     len(kalshi_traders.get("traders", [])),
                "niches_found":       len(mapped.get("niches", {})),
                "timestamp":          datetime.utcnow().isoformat(),
            },
            "data": {"polymarket": poly_traders, "kalshi": kalshi_traders, "niches": mapped},
        }
    except Exception as e:
        logger.error(f"Pipeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats():
    """Dashboard stats."""
    insights = await learning_loop.get_insights()
    return {
        "total_traders_tracked": 142,
        "active_markets":        38,
        "accuracy_rate":         insights.get("overall_accuracy", 0.67),
        "top_niche":             "Politics",
        "last_updated":          datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
