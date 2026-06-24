"""
Resume text extraction from bytes fetched from Cloudinary.

Security note: the extracted text is treated as untrusted input in all
downstream agent prompts — system prompts explicitly frame it as data,
not instructions, to guard against prompt injection.
"""
import io
import logging

logger = logging.getLogger(__name__)


def extract_text(content: bytes, filename: str) -> str:
    """
    Extract plain text from resume bytes.

    Supports: .pdf (pypdf), .docx / .doc (python-docx).
    Returns empty string for unsupported formats — callers should validate
    the extension before calling this and surface an error to the user.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            logger.error("PDF extraction failed: %s", e)
            return ""

    if ext in ("docx", "doc"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            logger.error("DOCX extraction failed: %s", e)
            return ""

    logger.warning("Unsupported file extension for text extraction: %s", ext)
    return ""
