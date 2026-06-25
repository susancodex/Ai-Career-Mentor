# AI Career Mentor

An AI-powered career coaching platform that analyses resumes, detects skill gaps, recommends
career paths, matches jobs, generates interview questions, and provides a multi-agent chat
coach — built on the free-tier stack (Gemini 2.5 Flash, pgvector, Langfuse, Cloudinary).

---

## 1. Project Overview

AI Career Mentor combines a Django REST backend, a FastAPI LangGraph agent service, and a
React frontend into a single deployable monorepo. Every AI feature is powered by Google's
Gemini API free tier — no billing account required. The system is designed to degrade
gracefully at free-tier limits: async tasks return 202 immediately, rate-limit errors surface
as user-readable messages rather than spinners, and the token-bucket rate limiter proactively
stays under Gemini's 10 RPM ceiling.

Technically interesting aspects:
- **LangGraph agents** for resume analysis, career-path planning, job matching, interview
  question generation, and multi-turn chat — each with Pydantic output validation and a
  repair-prompt retry loop.
- **SSE streaming** for the chat interface: Django relays tokens from FastAPI to the browser
  in real time, with Nginx configured to never buffer the stream.
- **HMAC-signed internal calls**: Django → AI service requests are signed with a shared
  secret and rejected if older than 60 seconds, preventing replay attacks.
- **pgvector** cosine-similarity job matching using 768-dimension Gemini embeddings.
- **Langfuse** self-hosted tracing for every LLM call — free, unlimited, no SaaS dependency.

---

## 2. Architecture

```
Browser
  │
  ▼
Nginx (port 80/443)
  ├── /api/*        → Django (port 8000)   ← REST API + SSE relay
  │                       │
  │                       │  HMAC-signed (X-Signature + X-Timestamp)
  │                       ▼
  │                 FastAPI AI Service (port 8001, internal only)
  │                       │
  │                       ▼
  │                 Gemini API (google.generativeai)
  │
  └── /*            → React SPA (Nginx static / Vite dev server)

Browser ──direct upload──▶ Cloudinary (resume files, no backend proxy)
Django  ──async tasks──▶   Celery Worker ──▶ Redis (broker)
Django/AI Service ──────▶  PostgreSQL + pgvector (shared instance)
AI Service ─────────────▶  Langfuse (LLM tracing, self-hosted)
```

---

## 3. Local Development Setup

### Prerequisites
- Docker Desktop (or Docker + Compose plugin)
- Node.js 20 + pnpm 10
- Python 3.12

### Step 1 — Clone and configure environment

```bash
git clone https://github.com/yourorg/ai-career-mentor.git
cd ai-career-mentor
cp .env.example .env
# Fill in .env — minimum required keys are listed in Section 4
```

### Step 2 — Start the full stack

```bash
make up
```

This brings up all 7 services. First boot takes 2–3 minutes to pull images.

- Frontend: http://localhost
- API docs: http://localhost/api/v1/schema/swagger-ui/
- Django admin: http://localhost/admin/
- Langfuse: http://localhost:3001

### Step 3 — (Optional) Active frontend development with Vite hot-reload

```bash
# Start only the backend services
docker compose -f infra/docker-compose.yml up postgres redis ai_service backend celery_worker

# In a separate terminal — Vite dev server proxies /api → localhost:8000
cd frontend && pnpm dev
```

---

## 4. Environment Variables

| Variable | Required | Where to get it |
|---|---|---|
| `GOOGLE_API_KEY` | Yes | [Google AI Studio](https://aistudio.google.com/app/apikey) — keep billing **disabled** |
| `AI_SERVICE_SHARED_SECRET` | Yes | `openssl rand -hex 32` — same value in both services |
| `SECRET_KEY` | Yes | `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| `DATABASE_URL` | Yes | Auto-configured by Docker Compose; override for external DB |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary dashboard — server-side only, never sent to browser |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Yes | Cloudinary → Settings → Upload → Add unsigned preset (raw, PDF/DOCX only) |
| `LANGFUSE_PUBLIC_KEY` | No | Langfuse UI at http://localhost:3001 after first boot |
| `LANGFUSE_SECRET_KEY` | No | Same |
| `SENTRY_DSN` | No | Sentry project settings |
| `GEMINI_DEFAULT_MODEL` | No | Defaults to `gemini-2.5-flash` |
| `GEMINI_RPM_LIMIT` | No | Defaults to `8` (conservative free-tier limit) |

See `.env.example` for the full list with descriptions.

---

## 5. Running Tests

```bash
make test          # all three service suites (LLM always mocked, no real API calls)
```

Or individually:

```bash
cd backend    && pytest tests/ -v    # Django — SQLite in-memory, AI service mocked
cd ai_service && pytest tests/ -v    # FastAPI — DB mocked, Gemini mocked
cd frontend   && pnpm test --run     # Vitest + MSW, no real network calls
```

**Golden tests** (real Gemini API, nightly only):

```bash
# Run manually — consumes free-tier quota
cd ai_service && pytest tests/golden/ -v --timeout=120
```

A 429 failure in golden tests means you've hit Gemini's 10 RPM / 500 RPD free-tier limit.
Lower `GEMINI_RPM_LIMIT` or add sleep buffers between test cases.

---

## 6. Project Structure

```
ai-career-mentor/
├── frontend/               React 19 + Vite + Tailwind — user-facing SPA
│   ├── src/api/            Axios client with token-refresh interceptor
│   ├── src/pages/          One file per route: Dashboard, Resume, Careers, Jobs …
│   ├── src/store/          Zustand auth store (access token in memory only)
│   └── src/mocks/          MSW handlers — disabled automatically in production builds
├── backend/                Django 5 + DRF — auth, persistence, Celery tasks, REST API
│   ├── apps/users/         Custom User model, JWT auth endpoints, httpOnly cookie refresh
│   ├── apps/resumes/       Resume upload + async analysis
│   ├── apps/careers/       Career path + skill gap models
│   ├── apps/jobs/          Job match model + async status polling
│   ├── apps/interviews/    Interview session + question models
│   ├── apps/learning/      Learning roadmap + resource models
│   ├── apps/chat/          ChatSession + SSE proxy view
│   └── core/ai_client.py   HMAC-signed HTTP client for Django → AI service
├── ai_service/             FastAPI + LangGraph — internal AI agent service
│   ├── app/agents/         5 LangGraph agents + orchestrator
│   ├── app/core/           Config, Gemini client (rate limiter + Langfuse), security
│   ├── app/api/v1/         FastAPI routers (resume, career, jobs, interview, learning, chat)
│   └── app/tools/          Rate limiter, vector store, document parser
├── infra/
│   ├── docker-compose.yml          Full local dev stack (7 services)
│   ├── docker-compose.prod.yml     Production overrides (no bind mounts, internal networks)
│   ├── nginx/nginx.conf            Reverse proxy — routes /api → Django, / → React, SSE unbuffered
│   └── langfuse/                   Self-hosted Langfuse compose (optional)
├── .github/workflows/
│   ├── ci.yml              Lint + type-check + test (all 3 services, LLM always mocked)
│   ├── cd-staging.yml      Build images + deploy to staging on merge to main
│   ├── cd-prod.yml         Promote staging → production (manual approval required)
│   └── golden-tests.yml    Nightly: real Gemini API, separate quota key
├── Makefile                Convenience targets: up, down, test, lint, migrate
└── .env.example            Full environment variable reference
```

---

## 7. API Reference

When running locally:

- **Django REST API** (DRF + OpenAPI): http://localhost/api/v1/schema/swagger-ui/
- **FastAPI AI service** (internal, dev only): http://localhost:8001/docs

Key endpoints:

| Method | Path | Description |
|---|---|---|
| POST | `/api/v1/auth/register/` | Register — returns access token, sets httpOnly refresh cookie |
| POST | `/api/v1/auth/login/` | Login — same |
| POST | `/api/v1/auth/refresh/` | Silent refresh from httpOnly cookie |
| POST | `/api/v1/auth/logout/` | Blacklist refresh token, clear cookie |
| GET/PATCH | `/api/v1/me/` | Current user profile |
| POST | `/api/v1/resumes/` | Upload resume (Cloudinary URL) |
| GET | `/api/v1/resumes/{id}/analysis/` | Resume analysis results |
| POST | `/api/v1/careers/generate/` | Generate career paths (async, returns 202 + job_id) |
| POST | `/api/v1/jobs/match/` | Match jobs (async) |
| POST | `/api/v1/interviews/generate/` | Generate interview questions (async) |
| POST | `/api/v1/learning/generate/` | Generate learning roadmap (async) |
| GET | `/api/v1/jobs/async-status/{job_id}/` | Poll async task status |
| POST | `/api/v1/chat/sessions/` | Create chat session |
| POST | `/api/v1/chat/sessions/{id}/messages/` | Send message — returns `text/event-stream` |

---

## 8. Deployment Guide

### Staging (automatic — merge to `main`)

The `cd-staging.yml` workflow runs automatically on every merge to `main`:
1. Builds Docker images for backend, AI service, and frontend
2. Pushes to your container registry (configured via `REGISTRY` secret)
3. Deploys to your staging host

Configure these GitHub Actions secrets:
- `REGISTRY` — e.g. `ghcr.io`
- `STAGING_API_BASE_URL` — e.g. `https://api.staging.yourdomain.com/api/v1`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`

Fill in the deploy step in `.github/workflows/cd-staging.yml` with your hosting provider's
deploy command (SSH + docker compose, Fly.io, Render, etc.).

### Production (manual approval)

Trigger `cd-prod.yml` from GitHub Actions → Run workflow:
- Provide the staging image tag to promote (or use `staging-latest`)
- Provide a deployment reason (required)
- A GitHub Environment protection rule will require manual approval before the deploy runs

### Post-deploy migrations

After any deploy that includes Django model changes:

```bash
docker compose exec backend python manage.py migrate --noinput
```

---

## 9. Free-Tier Constraints

| Service | Free limit | How the system handles it |
|---|---|---|
| Gemini API | 10 RPM / 500 RPD (gemini-2.5-flash) | Token-bucket rate limiter in `gemini_client.py`; configurable via `GEMINI_RPM_LIMIT` env var. 429s surface as user-readable error messages, not silent failures. |
| Cloudinary | 25 GB storage / 25 GB bandwidth/month | Resumes only (PDF/DOCX ≤5 MB). File type and size validated client-side before upload. |
| Langfuse (self-hosted) | Unlimited | Runs in your own Docker container on the same host. Switch to `cloud.langfuse.com` free tier for a managed option. |
| pgvector | Limited by Postgres host RAM | IVFFlat index performs poorly under ~1000 rows — exact scan is used until that threshold. |

---

## 10. Contributing

- **Branch naming**: `feat/`, `fix/`, `chore/` prefix — e.g. `feat/resume-skills-from-db`
- **PRs**: One feature/fix per PR. Include a description of what changed and why.
- **STOP checkpoints**: Integration work in particular — read generated diffs before accepting,
  especially CORS config, cookie attributes, and HMAC signing logic.
- **No real API calls in CI**: All tests mock `get_llm()` / `invoke_with_backoff()`. If your
  change needs a real Gemini response to test, add it to `tests/golden/` and document the
  expected RPM cost.
- **Security gaps are not TODOs**: Any stub or "left as an exercise" in integration code is
  a security gap. Flag it in the PR — don't merge until resolved.
