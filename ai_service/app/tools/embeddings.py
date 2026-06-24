"""
Gemini embeddings wrapper.

Model: gemini-embedding-001, output dimensionality fixed at 768.
This is intentionally 768 (not 1536) to match the pgvector column definition
and keep the index lean on the free-tier Postgres instance.

Usage:
    vector = await embed_text("some text about a Python developer")
"""
import logging
from typing import List

from app.core.config import settings

logger = logging.getLogger(__name__)


async def embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> List[float]:
    """
    Embed text using Gemini embedding-001 at 768 dimensions.

    task_type options:
      RETRIEVAL_DOCUMENT  — for resume/job text being indexed
      RETRIEVAL_QUERY     — for query-time similarity search
    """
    from langchain_google_genai import GoogleGenerativeAIEmbeddings

    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=settings.GOOGLE_API_KEY,
        task_type=task_type,
        output_dimensionality=768,
    )
    vector = await embeddings.aembed_query(text)
    if len(vector) != 768:
        logger.warning("Unexpected embedding dimension: %d (expected 768)", len(vector))
    return vector
