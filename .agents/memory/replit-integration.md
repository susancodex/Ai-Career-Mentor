---
name: Replit integration setup
description: How the Django+React full-stack was wired up on Replit — workflows, DB, env vars, migrations, tsconfig path fix.
---

## Key decisions

- **Python packages**: installed via `installLanguagePackages` skill (uses uv internally). The `.pythonlibs` venv lives at project root.
- **pnpm workspace**: `onlyBuiltDependencies` in `pnpm-workspace.yaml` must be a YAML array, not a JSON-encoded string `'["esbuild","msw","rollup"]'`. Changed to multi-line array.
- **Django migrations**: migrations already existed in codebase; ran `migrate` against Replit PostgreSQL (DATABASE_URL secret auto-provisioned).
- **ALLOWED_HOSTS**: set to `*` in `config.settings.dev`. Dev settings already allow all hosts/CORS.
- **CORS**: `CORS_ALLOW_ALL_ORIGINS = DEBUG` in base settings; dev.py sets DEBUG=True so all origins open in dev.

## Workflows configured

- `Start application`: `cd frontend && PORT=5000 BASE_PATH=/ pnpm dev` — port 5000, webview (required)
- `Start Backend`: `cd backend && DJANGO_SETTINGS_MODULE=config.settings.dev python3 manage.py runserver 0.0.0.0:8000` — port 8000, console
- AI Service (port 8001): not in a workflow (port not supported). Run manually or extend to use port 8000 internally.

## Env vars set (shared)

- `PORT=5000`, `BASE_PATH=/`, `DJANGO_PORT=8000`, `AI_SERVICE_PORT=8001`
- `DJANGO_SETTINGS_MODULE=config.settings.dev`
- `DEBUG=True`, `DJANGO_ALLOW_ASYNC_UNSAFE=true`
- `AI_SERVICE_URL=http://localhost:8001`, `AI_SERVICE_SHARED_SECRET=dev-shared-secret-change-in-prod`

## Database

- Replit PostgreSQL provisioned — DATABASE_URL, PGHOST, PGDATABASE, PGPORT, PGUSER, PGPASSWORD secrets auto-set
- Ran `python3 manage.py migrate` successfully — all migrations applied including token_blacklist

## Vite proxy

`vite.config.ts` proxies `/api` → `http://127.0.0.1:${DJANGO_PORT}`. Frontend calls relative `/api/v1/...`
which Vite proxies to Django. No CORS issues in dev.

## tsconfig paths

`frontend/tsconfig.json` extends `../tsconfig.base.json` (one level up from frontend/) — correct as-is.
