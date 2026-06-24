# AI Career Mentor

An AI-powered career coaching platform that analyses resumes, detects skill gaps, recommends career paths, matches jobs, generates interview questions, and provides a multi-agent chat coach — all running on the free-tier stack (Gemini API, pgvector, Langfuse, Cloudinary).

## Run & Operate

### Docker (full stack — recommended)
```bash
cd infra
docker-compose up
```
Brings up: Django (8000), FastAPI AI service (8001), Postgres+pgvector, Redis, Celery worker, Langfuse (3000).

### Backend only (Django)
```bash
cd backend
pip install -r requirements/dev.txt
python manage.py migrate
python manage.py runserver
```

### AI Service only (FastAPI)
```bash
cd ai_service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Tests
```bash
cd backend && pytest tests/ -v           # Django tests (AI mocked)
cd ai_service && pytest tests/ -v        # FastAPI tests (LLM mocked)
```

### Seed job listings (dev only)
```bash
cd ai_service && python -m scripts.seed_jobs
```

## Stack

### Backend (Django + DRF)
- Python 3.12, Django 5.0, DRF, SimpleJWT
- Celery + Redis for async task queue
- PostgreSQL (pgvector extension for embeddings)
- drf-spectacular for OpenAPI schema

### AI Service (FastAPI)
- Python 3.12, FastAPI, LangGraph/LangChain
- **LLM**: Gemini API (`gemini-2.5-flash`) via `langchain-google-genai` — free tier, no billing
- **Embeddings**: `gemini-embedding-001` at 768 dims
- **Tracing**: Langfuse (self-hosted Docker, unlimited free)
- **Vector search**: pgvector on the same Postgres instance
- **File storage**: Cloudinary (browser uploads directly; backend stores URL only)

## Where things live

| Path | Contents |
|---|---|
| `backend/` | Django service — auth, persistence, Celery tasks, REST API |
| `backend/apps/users/` | Custom User + Profile models, JWT auth |
| `backend/apps/resumes/` | Resume model (cloudinary_url/public_id), analysis results |
| `backend/apps/careers/` | CareerPath + SkillGap models |
| `backend/apps/jobs/` | JobMatch model + async status polling |
| `backend/apps/interviews/` | InterviewSession + InterviewQuestion |
| `backend/apps/learning/` | LearningRoadmap + LearningResource |
| `backend/apps/chat/` | ChatSession + ChatMessage, SSE proxy view |
| `backend/core/ai_client.py` | HMAC-signed HTTP client for Django → AI service |
| `ai_service/` | FastAPI AI service — internal only, no public route |
| `ai_service/app/agents/` | 5 LangGraph agents + LangGraph orchestrator |
| `ai_service/app/core/gemini_client.py` | Shared LLM wrapper (rate limiter + Langfuse) |
| `ai_service/app/tools/rate_limiter.py` | Token-bucket rate limiter (proactive free-tier throttling) |
| `ai_service/app/tools/vector_store.py` | pgvector cosine-similarity job search |
| `infra/docker-compose.yml` | Full local dev stack |
| `infra/init-db.sql` | pgvector extension + job_listings table |

## Architecture decisions

- **Async by default**: Resume analysis, skill gaps, job matching, interview questions, and roadmaps are all Celery tasks returning 202 + job_id immediately. Only chat is live-streamed.
- **Centralised LLM wrapper**: All agents use `get_llm()` / `invoke_with_backoff()` from `gemini_client.py` — rate limiting and tracing cannot be bypassed or duplicated per-agent.
- **HMAC replay protection**: Django → AI service calls are signed with a timestamp; the AI service rejects signatures older than 60s to prevent replay attacks.
- **768-dim embeddings**: Gemini `gemini-embedding-001` is configured to output 768 dims (not 1536) to keep the pgvector index lean on a free-tier Postgres instance.
- **Pydantic schema validation on every agent**: Each agent validates LLM output against a strict schema and retries once with a repair prompt before raising a typed error — never returns malformed data to the DB.
- **Prompt injection hygiene**: Every agent system prompt explicitly frames resume/job content as untrusted data, not instructions.

## Env vars needed

Copy `backend/.env.example` → `backend/.env` and `ai_service/.env.example` → `ai_service/.env`, then fill in:
- `GOOGLE_API_KEY` — from Google AI Studio (keep billing **disabled** on this project)
- `AI_SERVICE_SHARED_SECRET` — same value in both files (HMAC signing)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` — from Langfuse UI after first boot

## Open tasks (explicit stubs)

- `ai_service/app/api/v1/career.py`: resume skills/summary fetched from DB by resume_id (currently empty list)
- `ai_service/app/api/v1/jobs.py`: resume embedding fetched from DB by resume_id (currently empty)
- `ai_service/app/api/v1/chat.py`: conversation history fetched from DB (currently empty)
- `ai_service/app/agents/orchestrator.py`: PostgresSaver checkpointer (currently MemorySaver — loses state on restart)
- `ai_service/app/agents/orchestrator.py`: Real token streaming via `llm.astream()` (currently word-split simulation)
- Job listings seed uses fixture data — wire a real job-board API when ready

## Gotchas

- Never enable billing on the Google Cloud project used for `GOOGLE_API_KEY` — it removes the free tier instead of adding overage
- `pgvector` extension must be enabled before running Django migrations (`infra/init-db.sql` handles this for Docker)
- Langfuse needs its own database (`langfuse` DB — created in `init-db.sql`)
- CI must never hit the real Gemini API — always mock `get_llm()` / `invoke_with_backoff()`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
