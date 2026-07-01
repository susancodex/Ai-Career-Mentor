import json
import logging
from typing import Optional

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.gemini_client import get_llm, invoke_with_backoff
from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)

_MARKET_RESEARCH_SYSTEM = """You are a labor market research analyst with knowledge of current hiring trends.
Given a target role and any available market search data, return ONLY a JSON object:
{
  "current_market_requirements": ["requirement 1", "requirement 2"],
  "typical_salary_range": {"min": 90000, "max": 140000, "currency": "USD", "period": "annual"},
  "real_job_listings": [
    {"title": "...", "company": "...", "location": "...", "url": ""}
  ],
  "trend_summary": "2-3 sentences summarising the current market for this role"
}
Rules:
- current_market_requirements: 5-8 specific skills/tools employers are actually requiring in 2025/2026
- typical_salary_range: realistic range based on role seniority and location, in USD annual unless clearly non-US
- real_job_listings: 3-5 realistic companies actively hiring for this role (real company names, real cities)
- trend_summary: concise market context a job seeker would find useful
If web search data is provided, ground your response in it. Otherwise use your training knowledge."""


async def job_research_node(state: CareerMentorState) -> CareerMentorState:
    target_role = state.get("target_role") or ""
    location = state.get("location_preference") or "United States"
    session_id = state.get("user_id")

    tavily_context = ""
    try:
        from tavily import TavilyClient
        from app.core.config import settings
        api_key = getattr(settings, "TAVILY_API_KEY", None)
        if api_key:
            tavily = TavilyClient(api_key=api_key)
            search_results = tavily.search(
                query=f"{target_role} salary job requirements 2026 {location}",
                search_depth="advanced",
                max_results=8,
            )
            if isinstance(search_results, dict) and "results" in search_results:
                snippets = [r.get("content", "") for r in search_results["results"][:5] if r.get("content")]
                tavily_context = "\n\n".join(snippets)
    except Exception as e:
        logger.info("Tavily search skipped (key not set or failed): %s", e)

    llm = get_llm(session_id=session_id)
    human_prompt = f"Target role: {target_role}\nLocation: {location}\n"
    if tavily_context:
        human_prompt += f"\nCurrent web search data:\n{tavily_context[:3000]}\n"
    human_prompt += "\nReturn the structured market research JSON."

    messages = [
        SystemMessage(content=_MARKET_RESEARCH_SYSTEM),
        HumanMessage(content=human_prompt),
    ]

    try:
        response = await invoke_with_backoff(llm, messages)
        market_data = _parse(response.content)

        if market_data is None:
            repair_msg = [*messages, response, HumanMessage(content="Fix your JSON to match the schema exactly.")]
            response = await invoke_with_backoff(llm, repair_msg)
            market_data = _parse(response.content)

        if market_data is None:
            raise ValueError("Market research agent failed to produce valid JSON after repair")

    except Exception as exc:
        logger.warning("Job research LLM call failed: %s", exc)
        errors = state.get("errors", []) + [f"job_research: {exc}"]
        market_data = {
            "current_market_requirements": [],
            "typical_salary_range": {},
            "real_job_listings": [],
            "trend_summary": "Market data temporarily unavailable.",
        }
        return {**state, "market_data": market_data, "errors": errors}

    return {**state, "market_data": market_data}


def _parse(content: str) -> Optional[dict]:
    try:
        text = content.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        data = json.loads(text.strip())
        required = {"current_market_requirements", "typical_salary_range", "real_job_listings", "trend_summary"}
        if not required.issubset(data.keys()):
            logger.warning("Market research response missing keys: %s", data.keys())
            return None
        return data
    except Exception as e:
        logger.warning("Job research parse error: %s", e)
        return None
