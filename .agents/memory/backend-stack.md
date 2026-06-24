---
name: Backend stack
description: AI Career Mentor backend architecture decisions, free-tier constraints, and stub locations
---

## Stack
- Django 5 + DRF + SimpleJWT + Celery/Redis (backend/)
- FastAPI + LangGraph + langchain-google-genai (ai_service/)
- Gemini API free tier: gemini-2.5-flash (default), gemini-2.5-flash-lite (fallback)
- Embeddings: gemini-embedding-001 at 768 dims (NOT 1536 — intentional for pgvector index size)
- Vector store: pgvector on same Postgres (no Pinecone)
- Tracing: Langfuse self-hosted Docker (no LangSmith)
- File storage: Cloudinary URL-only on backend (browser uploads direct)

## Critical rules
- Never enable billing on the GOOGLE_API_KEY project — removes free tier
- All LLM calls must go through get_llm() / invoke_with_backoff() in gemini_client.py
- Tests must never hit real Gemini API — mock at the gemini_client boundary
- HMAC signatures must be verified with timestamp check (60s window) on AI service

## Explicit stubs (open tasks)
- ai_service/app/api/v1/career.py: resume skills/summary DB lookup by resume_id
- ai_service/app/api/v1/jobs.py: resume embedding DB lookup by resume_id
- ai_service/app/api/v1/chat.py: conversation history DB lookup by session_id
- ai_service/app/agents/orchestrator.py: PostgresSaver (using MemorySaver now — loses state on restart)
- ai_service/app/agents/orchestrator.py: real token streaming via llm.astream() (word-split simulation now)
- Job seeding: fixture data only — real job-board API integration pending

**Why stubs exist:** The AI service routes need resume/embedding/history data from the Django DB. 
The proper pattern is an internal DB read (shared Postgres) or a secondary HMAC-signed call back. 
Chosen not to implement to avoid circular dependency complexity before the DB layer is wired.
