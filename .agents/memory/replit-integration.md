---
name: Replit integration setup
description: How the Django+React full-stack was wired up on Replit — workflows, DB, env vars, migrations, tsconfig path fix.
---

## Key decisions

- **Python packages**: installed via `uv sync` against `pyproject.toml` (not `pip install -r`). The `.pythonlibs` venv lives at project root.
- **httpx conflict**: backend `requirements/base.txt` pinned `httpx==0.27.0` but `langchain-google-genai` needs `>=0.28.1`. Fix: use `pyproject.toml` which already had `httpx>=0.28.1`.
- **python-json-logger**: not in original `pyproject.toml`; was referenced in Django LOGGING. Fixed two ways: removed the json formatter from settings (use simple formatter), and also added `python-json-logger>=2.0.7` to `pyproject.toml`.
- **Django migrations**: no migrations existed; ran `makemigrations users resumes careers jobs interviews learning chat` before `migrate`.
- **ALLOWED_HOSTS**: set to `*` via env var `ALLOWED_HOSTS=*`. Settings updated to parse `*` as a literal wildcard list.
- **CORS**: set `CORS_ALLOW_ALL_ORIGINS = DEBUG` so dev mode opens all origins. Production still uses `CORS_ALLOWED_ORIGINS` env var.

## Workflows configured

- `Start application`: `cd frontend && pnpm run dev` — port 5173, webview
- `Django Backend`: `cd backend && DJANGO_SETTINGS_MODULE=config.settings.base python manage.py runserver 0.0.0.0:8000` — port 8000, console

## Env vars set (shared)

- `DEBUG=True`, `ALLOWED_HOSTS=*`, `DJANGO_PORT=8000`, `PORT=5173`, `BASE_PATH=/`
- `DJANGO_SETTINGS_MODULE=config.settings.base`
- `AI_SERVICE_URL=http://localhost:8001`, `AI_SERVICE_SHARED_SECRET=dev-shared-secret-replit`
- `REDIS_URL=redis://localhost:6379/0`

## tsconfig fix

`frontend/tsconfig.json` had `extends: "../../tsconfig.base.json"` and `references: ["../../lib/api-client-react"]`. Correct paths from `frontend/` are `../tsconfig.base.json` and `../lib/api-client-react`.

**Why:** The frontend was structured as if it lived under `artifacts/frontend/` (two levels deep) but it actually lives at `frontend/` (one level from workspace root).

## Vite proxy

`vite.config.ts` already proxies `/api` → `http://127.0.0.1:${DJANGO_PORT}`. Frontend calls `apiClient.post('/auth/register/')` which becomes `/api/v1/auth/register/` via the `VITE_API_BASE_URL || '/api/v1'` base URL, then the Vite dev server proxies it to Django on port 8000. No CORS issues in dev.
