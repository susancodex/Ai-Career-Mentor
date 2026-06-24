"""
pgvector similarity search helpers.

Uses SQLAlchemy async to query the job_listings table with cosine similarity
against a 768-dim resume embedding.

The job_listings table must have the pgvector extension enabled and an
IVFFlat or HNSW index on the embedding column:
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE INDEX ON job_listings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
"""
import json
import logging
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

from app.core.config import settings

logger = logging.getLogger(__name__)

_engine = None
_async_session = None


def _get_engine():
    global _engine, _async_session
    if _engine is None:
        _engine = create_async_engine(settings.DATABASE_URL, echo=False)
        _async_session = sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _engine, _async_session


async def search_similar_jobs(
    resume_embedding: List[float],
    limit: int = 10,
    min_score: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Find job listings by cosine similarity to a resume embedding.
    Returns a list of dicts with job metadata and similarity score.
    """
    _, session_factory = _get_engine()
    vector_str = "[" + ",".join(str(x) for x in resume_embedding) + "]"

    async with session_factory() as session:
        result = await session.execute(
            text(
                """
                SELECT
                    id, title, company, location, description, external_url,
                    1 - (embedding <=> :embedding::vector) AS similarity
                FROM job_listings
                WHERE 1 - (embedding <=> :embedding::vector) >= :min_score
                ORDER BY embedding <=> :embedding::vector
                LIMIT :limit
                """
            ),
            {"embedding": vector_str, "min_score": min_score, "limit": limit},
        )
        rows = result.mappings().all()
        return [dict(r) for r in rows]


async def upsert_job_listing(job: Dict[str, Any], embedding: List[float]) -> None:
    """Insert or update a job listing with its embedding."""
    _, session_factory = _get_engine()
    vector_str = "[" + ",".join(str(x) for x in embedding) + "]"

    async with session_factory() as session:
        await session.execute(
            text(
                """
                INSERT INTO job_listings (id, title, company, location, description, external_url, embedding)
                VALUES (:id, :title, :company, :location, :description, :external_url, :embedding::vector)
                ON CONFLICT (id) DO UPDATE
                  SET title = EXCLUDED.title,
                      company = EXCLUDED.company,
                      location = EXCLUDED.location,
                      description = EXCLUDED.description,
                      external_url = EXCLUDED.external_url,
                      embedding = EXCLUDED.embedding
                """
            ),
            {**job, "embedding": vector_str},
        )
        await session.commit()
