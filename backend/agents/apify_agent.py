"""
Agent 4 — Apify Enrichment Agent
Scrapes web data for prediction market events and enriches the RAG context.
Uses Apify Google Search scraper (free tier).
"""

import os
import json
import httpx
from datetime import datetime
from utils.logger import setup_logger
from utils.llm_client import llm_complete

logger = setup_logger("neurotrade.agents.apify")

APIFY_TOKEN   = os.getenv("APIFY_API_TOKEN", "")
APIFY_BASE    = "https://api.apify.com/v2"

# In-memory RAG store (replace with vector DB in production)
_RAG_STORE: dict[str, dict] = {}


class ApifyEnrichmentAgent:
    """
    Hermes-style agent that:
    1. Runs Apify Google search scraper for the event
    2. Extracts key facts / sentiment
    3. Stores enriched context in RAG store
    4. Returns structured enrichment
    """

    def __init__(self):
        self.name = "ApifyEnrichmentAgent"

    async def enrich_event(self, event_title: str, event_id: str | None = None) -> dict:
        logger.info(f"[{self.name}] Enriching: {event_title}")

        # Step 1: Scrape via Apify
        raw_results = await self._apify_search(event_title)

        # Step 2: LLM extraction
        facts = await self._extract_facts(event_title, raw_results)

        # Step 3: Store in RAG
        doc_id = event_id or event_title.lower().replace(" ", "_")[:50]
        _RAG_STORE[doc_id] = {
            "event_title":   event_title,
            "facts":         facts,
            "raw_count":     len(raw_results),
            "enriched_at":   datetime.utcnow().isoformat(),
        }

        logger.info(f"[{self.name}] Stored enrichment for '{doc_id}' in RAG")
        return {
            "event_title":  event_title,
            "doc_id":       doc_id,
            "facts":        facts,
            "sources_used": len(raw_results),
            "rag_stored":   True,
            "timestamp":    datetime.utcnow().isoformat(),
        }

    def get_rag_context(self, query: str, top_k: int = 5) -> list[dict]:
        """Simple keyword-based retrieval from RAG store."""
        query_lower = query.lower()
        results = []
        for doc_id, doc in _RAG_STORE.items():
            relevance = sum(
                1 for word in query_lower.split()
                if word in doc["event_title"].lower()
            )
            if relevance > 0:
                results.append({"doc_id": doc_id, "relevance": relevance, **doc})
        results.sort(key=lambda x: x["relevance"], reverse=True)
        return results[:top_k]

    def list_rag_documents(self) -> list[dict]:
        return [
            {"doc_id": k, "event_title": v["event_title"], "enriched_at": v["enriched_at"]}
            for k, v in _RAG_STORE.items()
        ]

    # ── Tools ─────────────────────────────────────────────────────────────────

    async def _apify_search(self, query: str) -> list[dict]:
        """Run Apify Google Search scraper."""
        if not APIFY_TOKEN:
            logger.warning(f"[{self.name}] No APIFY_API_TOKEN — using mock search results")
            return self._mock_search_results(query)

        try:
            actor_id = "apify~google-search-scraper"
            async with httpx.AsyncClient(timeout=60) as client:
                # Start run
                start_resp = await client.post(
                    f"{APIFY_BASE}/acts/{actor_id}/runs",
                    params={"token": APIFY_TOKEN},
                    json={
                        "queries": query,
                        "maxPagesPerQuery": 1,
                        "resultsPerPage": 10,
                        "languageCode": "en",
                        "countryCode": "us",
                    },
                )
                start_resp.raise_for_status()
                run_id = start_resp.json()["data"]["id"]
                logger.info(f"[{self.name}] Apify run started: {run_id}")

                # Poll until finished
                for _ in range(12):
                    import asyncio
                    await asyncio.sleep(5)
                    status_resp = await client.get(
                        f"{APIFY_BASE}/actor-runs/{run_id}",
                        params={"token": APIFY_TOKEN},
                    )
                    status = status_resp.json()["data"]["status"]
                    if status == "SUCCEEDED":
                        break
                    if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                        raise RuntimeError(f"Apify run {status}")

                # Fetch results
                dataset_id = status_resp.json()["data"]["defaultDatasetId"]
                items_resp = await client.get(
                    f"{APIFY_BASE}/datasets/{dataset_id}/items",
                    params={"token": APIFY_TOKEN, "format": "json"},
                )
                items_resp.raise_for_status()
                return items_resp.json()

        except Exception as e:
            logger.error(f"[{self.name}] Apify error: {e} — using mock results")
            return self._mock_search_results(query)

    async def _extract_facts(self, event_title: str, results: list[dict]) -> dict:
        """LLM extracts structured facts from raw search results."""
        snippets = []
        for r in results[:8]:
            if isinstance(r, dict):
                title   = r.get("title", "")
                snippet = r.get("snippet", r.get("description", ""))
                url     = r.get("url", r.get("link", ""))
                if snippet:
                    snippets.append(f"- [{title}]({url}): {snippet}")

        if not snippets:
            return {"summary": "No data available.", "sentiment": "neutral", "key_facts": []}

        system = (
            "You are a prediction market research analyst. Extract structured intelligence. "
            "Respond ONLY with JSON. Keys: summary (string), sentiment (positive/negative/neutral/mixed), "
            "key_facts (array of strings, max 5), probability_hint (string: e.g. 'likely YES', 'toss-up', 'likely NO'). "
            "No markdown, no preamble."
        )
        user = (
            f"Event: {event_title}\n\nSearch results:\n" + "\n".join(snippets) +
            "\n\nExtract the key intelligence for a prediction market trader."
        )
        try:
            raw = await llm_complete(system, user, max_tokens=500)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Fact extraction failed: {e}")
            return {
                "summary":          f"Research gathered {len(snippets)} sources about '{event_title}'.",
                "sentiment":        "neutral",
                "key_facts":        [s[:120] for s in snippets[:3]],
                "probability_hint": "toss-up",
            }

    # ── Mock data ─────────────────────────────────────────────────────────────

    def _mock_search_results(self, query: str) -> list[dict]:
        return [
            {
                "title":       f"Analysis: {query} - Latest Update",
                "url":         f"https://example.com/article-{i}",
                "snippet":     f"Experts are divided on {query}. Recent polling shows significant uncertainty "
                               f"with current estimates placing the probability around {45+i*5}%.",
            }
            for i in range(6)
        ]
