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


def extract_text(content: bytes, content_type: str) -> str:
    """
    Extract plain text from resume bytes.

    Supports: PDF (pdfplumber), DOCX/DOC (python-docx).
    Raises ResumeParsingError on extraction failure or if the extracted text
    is too short to be useful (< MIN_TEXT_LENGTH chars) — this catches scanned
    image PDFs that parse "successfully" but produce no readable text.
    """
    if "pdf" in content_type:
        try:
            import pdfplumber
            text_chunks = []
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_chunks.append(page_text)
            text = "\n".join(text_chunks)
        except Exception as e:
            logger.error("PDF extraction failed (content_type=%r): %s", content_type, e)
            raise ResumeParsingError(
                "Could not read this PDF. It may be corrupted or password-protected. "
                "Try re-saving it as a standard PDF and uploading again."
            ) from e

    elif "wordprocessingml" in content_type or "docx" in content_type or "doc" in content_type:
        try:
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            logger.error("DOCX extraction failed (content_type=%r): %s", content_type, e)
            raise ResumeParsingError(
                "Could not read this DOCX file. It may be corrupted. "
                "Try re-saving it from Word and uploading again."
            ) from e

    else:
        raise ResumeParsingError(
            f"Unsupported file type: {content_type!r}. Please upload a PDF or DOCX file."
        )

    if len(text.strip()) < MIN_TEXT_LENGTH:
        raise ResumeParsingError(
            "Could not extract readable text from this file. "
            "It may be a scanned image — please upload a text-based PDF or DOCX "
            "(one where you can select and copy the text)."
        )

    return text


def content_type_from_filename(filename: str) -> str:
    """Derive a content_type string from the file extension for callers that only have a filename."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    mapping = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
    }
    return mapping.get(ext, f"application/{ext}")
