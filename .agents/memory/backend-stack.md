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
- All LLM calls must go through get_llm() / invoke_with_backoff() / stream_with_backoff() in gemini_client.py
- Tests must never hit real Gemini API — mock at the gemini_client boundary
- HMAC signatures must be verified with timestamp check (60s window) on AI service

## Test configuration
- Django tests: pytest.ini → config.settings.test (SQLite in-memory)
  - Why SQLite: no Postgres in Replit; all Django model fields are standard types
  - embedding column is a JSONField (not native pgvector) — SQLite handles it fine
- AI service tests: pool patched to None → empty-default branches cover no-DB case
- CI (ci.yml): both jobs also use SQLite/no-DB; no service containers needed

## Frontend ↔ Backend field-name contract
Serializers must produce these exact field names (frontend TypeScript types are authoritative):
- `ResumeAnalysis`: `extracted_skills` (source: skills), `extracted_experience` (source: experience), `resume_id`
- `CareerPath`: flat rows — `title`, `description`, `reasoning`, `match_score`, `required_skills`, `timeline_months` (one DB row per path, NOT a `paths` JSONField)
- `SkillGap`: `current_skills` (source: existing_skills), `resume_id`, `skill_levels` (JSONField)
- `JobMatch`: `title` (source: job_title), `status` (source: match_status), `match_reasoning` (source: fit_explanation), `job_url` (source: external_url), `salary_range`
- `InterviewSession`: includes `status` field (`pending|ready|completed`)
- `InterviewQuestion`: `question` (source: question_text), `session_id`
- `LearningRoadmap`: `skill_gap_id`, `description`, `estimated_hours`
- `LearningResource`: `type` (source: resource_type), `order_index` (source: order), `roadmap_id`
- `ChatSession`: includes `title` (auto-generated on creation)
- `ChatMessage`: includes `session_id`

SSE stream format (Django relay → browser):
- Token: `data: {"token": "<chunk>"}` (NOT `{type, content}`)
- Terminal: `data: [DONE]`
- Error/rate_limited: surface as token then `[DONE]`

**Why:** Frontend TypeScript types (`src/types.ts`) are the single source of truth per spec. "Do not require the frontend to change to match implementation details."

## Explicit stubs (open tasks)
- ai_service/app/agents/orchestrator.py: AsyncPostgresSaver (using MemorySaver now)
  — not critical: multi-turn context is preserved via DB-backed history from get_chat_history()
- ai_service/app/agents/orchestrator.py: specialist nodes all route to _stub_agent_node
  — for richer chaining, wire each agent as its own node
- Job seeding: fixture data only — real job-board API integration pending

**Why stubs exist:** PostgresSaver requires langgraph-checkpoint-postgres + psycopg[async];
DB-backed chat history (get_chat_history) already ensures multi-turn context survives restarts,
so MemorySaver is non-critical. Specialist node wiring deferred to avoid complexity before
the routing layer is verified stable.
