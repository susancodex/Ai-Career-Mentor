"""
Ingest real job listings from the RemoteOK public JSON API into the job_listings table.

Run with:
    cd ai_service
    python -m scripts.ingest_jobs

This replaces the old static seed_jobs.py fixture with live data. The
vector_search / pgvector pipeline in job_search_agent.py then operates on
real listings with real apply URLs.
"""
import asyncio
import logging
import uuid
from typing import Any

import httpx

from app.tools.embeddings import embed_text
from app.tools.vector_store import upsert_job_listing
from app.core.config import settings

logger = logging.getLogger(__name__)

REMOTEOK_API = "https://remoteok.com/api"
REQUEST_TIMEOUT = httpx.Timeout(30.0, connect=10.0)


async def fetch_remoteok() -> list[dict[str, Any]]:
    """
    Fetch the RemoteOK API and return the normalized job records.

    The RemoteOK endpoint returns a JSON array where index 0 is a legal notice
    and the remaining items are job objects. We normalise each record into the
    shape expected by upsert_job_listing().
    """
    headers = {"User-Agent": "AI-Career-Mentor/1.0 (+https://example.com)"}
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT, headers=headers) as client:
        response = await client.get(REMOTEOK_API)
        response.raise_for_status()
        data = response.json()

    if not isinstance(data, list) or len(data) < 2:
        logger.warning("Unexpected RemoteOK response shape (expected non-empty list).")
        return []

    jobs: list[dict[str, Any]] = []
    for item in data[1:]:
        if not isinstance(item, dict):
            continue

        # Required fields
        job_id = item.get("id") or str(uuid.uuid4())
        title = item.get("position") or item.get("title") or "Untitled Role"
        company = item.get("company") or "Unknown Company"
        description = item.get("description") or ""
        location = item.get("location") or "Remote"
        external_url = item.get("url") or item.get("apply_url") or item.get("link") or ""

        # Normalise description to plain text (RemoteOK returns HTML)
        if description:
            description = (
                description.replace("<br>", "\n")
                .replace("</p>", "\n")
                .replace("</li>", "\n")
                .replace("<ul>", "\n")
            )
            # Strip remaining tags crudely
            while "<" in description and ">" in description:
                start = description.index("<")
                end = description.index(">", start) + 1
                description = description[:start] + description[end:]
            description = description.strip()[:6000]  # cap to keep embedding size sane

        if not external_url:
            # Skip listings with no apply link — they can't be acted upon.
            continue

        jobs.append(
            {
                "id": str(job_id),
                "title": title,
                "company": company,
                "location": location,
                "description": description,
                "external_url": external_url,
            }
        )

    return jobs


async def generate_embedding_for_job(job: dict[str, Any]) -> list[float]:
    """Generate a 768-dim embedding for a job listing."""
    text = f"{job['title']} at {job['company']}. {job['description']}"
    return await embed_text(text, task_type="RETRIEVAL_DOCUMENT")


async def ingest() -> None:
    """Fetch, embed, and upsert jobs into the database."""
    logger.info("Fetching RemoteOK listings...")
    jobs = await fetch_remoteok()
    if not jobs:
        logger.info("No jobs fetched — exiting.")
        return

    logger.info("Processing %d jobs...", len(jobs))
    embedded = 0
    for i, job in enumerate(jobs):
        try:
            job["embedding"] = await generate_embedding_for_job(job)
            await upsert_job_listing(job, job["embedding"])
            embedded += 1
        except Exception:
            logger.exception("Failed to embed/upsert job %s (%s)", job.get("id"), job.get("title"))

    logger.info("Ingestion complete: %d/%d jobs embedded and stored.", embedded, len(jobs))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(ingest())
