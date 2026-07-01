"""
Resume text extraction from bytes fetched from Cloudinary.

Security note: the extracted text is treated as untrusted input in all
downstream agent prompts — system prompts explicitly frame it as data,
not instructions, to guard against prompt injection.
"""
import io
import logging

logger = logging.getLogger(__name__)

MIN_TEXT_LENGTH = 50  # chars of stripped text required to attempt AI analysis


class ResumeParsingError(ValueError):
    """Raised when a resume file cannot be parsed into readable text.

    This is a user-facing error — callers should surface the message directly.
    It intentionally does NOT inherit from Exception's silent-swallow path.
    """


def extract_text(content: bytes, filename: str) -> str:
    """
    Extract plain text from resume bytes.

    Supports: .pdf (pypdf), .docx / .doc (python-docx).
    Raises ResumeParsingError on extraction failure or if the extracted text
    is too short to be useful (< MIN_TEXT_LENGTH chars) — this catches scanned
    image PDFs that parse "successfully" but produce no readable text.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as e:
            logger.error("PDF extraction failed for %r: %s", filename, e)
            raise ResumeParsingError(
                "Could not read this PDF. It may be corrupted or password-protected. "
                "Try re-saving it as a standard PDF and uploading again."
            ) from e

    elif ext in ("docx", "doc"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            logger.error("DOCX extraction failed for %r: %s", filename, e)
            raise ResumeParsingError(
                "Could not read this DOCX file. It may be corrupted. "
                "Try re-saving it from Word and uploading again."
            ) from e

    else:
        raise ResumeParsingError(
            f"Unsupported file type '.{ext}'. Please upload a PDF or DOCX file."
        )

    if len(text.strip()) < MIN_TEXT_LENGTH:
        raise ResumeParsingError(
            "Could not extract readable text from this file. "
            "It may be a scanned image — please upload a text-based PDF or DOCX "
            "(one where you can select and copy the text)."
        )

    return text
