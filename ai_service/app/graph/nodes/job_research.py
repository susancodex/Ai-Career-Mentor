import logging

from app.graph.state import CareerMentorState

logger = logging.getLogger(__name__)


async def job_research_node(state: CareerMentorState) -> CareerMentorState:
    target_role = state.get("target_role") or ""
    location = state.get("location_preference")
    try:
        from tavily import TavilyClient
        from app.core.config import settings

        tavily = TavilyClient(api_key=getattr(settings, "TAVILY_API_KEY", None))
        search_results = tavily.search(
            query=f"{target_role} required skills 2026 job requirements",
            search_depth="advanced",
            max_results=8,
        )
        market_data = {
            "current_market_requirements": [],
            "typical_salary_range": {},
            "real_job_listings": [],
            "trend_summary": search_results,
        }
    except Exception as e:
        logger.warning("Job research via Tavily failed: %s", e)
        market_data = {
            "current_market_requirements": [],
            "typical_salary_range": {},
            "real_job_listings": [],
            "trend_summary": f"Market data unavailable: {e}",
        }

    return {**state, "market_data": market_data}
