"""
Cloudinary helper — fetch raw resume bytes from a Cloudinary secure_url.

The frontend uploads directly to Cloudinary (unsigned upload preset) and
sends only the resulting cloudinary_url + public_id to Django. This service
fetches the raw bytes server-side when it needs to extract text from the file.

CLOUDINARY_API_SECRET must only ever live on the backend — never expose it
to the browser or log it.
"""
import logging
import httpx

logger = logging.getLogger(__name__)


async def fetch_resume_bytes(cloudinary_url: str) -> bytes:
    """Download raw bytes from a Cloudinary secure URL."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(cloudinary_url)
        response.raise_for_status()
        return response.content
