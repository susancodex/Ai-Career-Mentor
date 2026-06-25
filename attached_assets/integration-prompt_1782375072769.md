# AI Career Mentor — Full-Stack Integration Prompt

> **Purpose:** This prompt integrates the separately-built React frontend and Django+FastAPI
> backend into a single, production-grade monorepo. Read both the `frontend-prompt.md` and
> `backend-prompt.md` first — this document assumes both services already exist and are
> independently functional. Do not use this to build either service from scratch.

---

## 0. Anti-Vibe-Coding Rules (read before opening any file)

Integration work is where AI-assisted coding causes the most invisible damage — a wrong
`CORS_ALLOWED_ORIGINS`, a missing `SameSite=None` on the refresh cookie, or a forwarded
header that strips `Authorization` are all bugs that look fine in isolation and only surface
under production conditions. Follow these rules without exception:

- **Review every diff before accepting it**, especially anything touching Nginx proxy
  config, CORS settings, cookie attributes, Docker network definitions, and the GitHub
  Actions secrets mapping. These are the surfaces where a plausible-looking mistake is
  easy to miss and hard to undo.
- **Build in the increments listed below, in order.** Do not jump to CI/CD before the
  local `docker compose up` stack is end-to-end verified. Do not wire Nginx before the
  Django→AI-service HMAC call works over the Docker network.
- **At every `STOP` below, actually stop.** Read the generated config or code, ask the
  agent to walk through it in plain language, and only continue once you can explain it
  yourself.
- **Run every verification step manually.** `curl` the endpoints directly. Check browser
  DevTools for cookie attributes. Read `docker compose logs` rather than assuming
  "containers are healthy" means "traffic routes correctly."
- **Any TODO, stub, or "left as an exercise" in integration code is a security gap until
  resolved**, not a cosmetic issue — flag it immediately.

---

## 1. What This Prompt Builds

```
ai-career-mentor/                   ← monorepo root (this prompt creates this)
├── frontend/                       ← existing React+Vite app (move here if not already)
├── backend/                        ← existing Django+DRF service (move here if not already)
├── ai_service/                     ← existing FastAPI+LangGraph service (move here)
├── infra/
│   ├── docker-compose.yml          ← full-stack local dev (all 7 services)
│   ├── docker-compose.prod.yml     ← production overrides (no bind mounts, pinned tags)
│   ├── nginx/
│   │   ├── nginx.conf              ← reverse proxy: routes /api/v1 → Django, / → React
│   │   └── ssl/                    ← cert placeholders for prod (Let's Encrypt / cert-bot)
│   └── langfuse/
│       └── docker-compose.langfuse.yml  ← self-hosted Langfuse (kept separate so it can
│                                           be swapped for the managed free tier easily)
├── .github/
│   └── workflows/
│       ├── ci.yml                  ← lint + type-check + test (all 3 services, LLM mocked)
│       ├── cd-staging.yml          ← build + push images → deploy to staging on merge to main
│       ├── cd-prod.yml             ← promote staging images → prod on manual approval
│       └── golden-tests.yml        ← nightly: real Gemini API, separate from normal CI
├── .env.example                    ← merged env reference for the whole monorepo
├── Makefile                        ← convenience targets: up, down, test, lint, migrate
└── README.md                       ← production-grade, covers setup through deployment
```

---

## 2. Pre-Integration Checklist

Before writing a single line of integration code, verify these things are true of both
existing services. If any are false, fix them in the service's own codebase first — don't
work around them at the integration layer.

### Backend (Django + DRF)
- [ ] `POST /auth/refresh/` reads the refresh token from an `httpOnly` cookie named
      `refresh_token`, not from the request body or `Authorization` header.
- [ ] `POST /auth/logout/` clears that cookie (`Max-Age=0`) in the response.
- [ ] `POST /auth/login/` and `POST /auth/register/` set the cookie with
      `HttpOnly=true; Secure=true; SameSite=None; Path=/api/v1/auth/refresh/` in production
      (so the browser sends it on cross-origin refresh calls to the same API domain) and
      `SameSite=Lax` in local dev (same domain, no HTTPS).
- [ ] `CORS_ALLOWED_ORIGINS` is read from an environment variable — not hardcoded.
- [ ] `CORS_ALLOW_CREDENTIALS = True` is set (required for cookies over CORS).
- [ ] `POST /chat/sessions/{id}/messages/` returns `Content-Type: text/event-stream` with
      `Cache-Control: no-cache` and `X-Accel-Buffering: no` (Nginx must not buffer SSE).
- [ ] Django's `SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")` is set so
      it knows it's behind a TLS-terminating proxy and generates correct cookie `Secure` flags.
- [ ] `ALLOWED_HOSTS` includes the service name `backend` (for Nginx→Django internal routing)
      and the public domain.
- [ ] `AI_SERVICE_URL` points to `http://ai_service:8001` (Docker service name, not localhost).

### AI Service (FastAPI)
- [ ] The service listens on `0.0.0.0:8001` (not `127.0.0.1`) inside its container.
- [ ] It is **not** exposed on a public port in the production compose file — only reachable
      via the `internal` Docker network from the `backend` service.
- [ ] HMAC verification rejects requests older than 60 seconds (replay protection tested).
- [ ] `GeminiClient` rate limiter is unit-tested under simulated burst (not just read and
      assumed to work).

### Frontend (React + Vite)
- [ ] `VITE_API_BASE_URL` is the only place the backend base URL is set — no hardcoded
      `localhost:8000` anywhere in production code paths.
- [ ] The Cloudinary upload helper validates file type (`.pdf`, `.docx`) and size (≤5 MB)
      before touching the Cloudinary API.
- [ ] The axios interceptor queues concurrent requests during a token refresh and does not
      fire N parallel refresh calls (test this with the `test:auth-interceptor` test).
- [ ] No access token is ever written to `localStorage` or `sessionStorage`.
- [ ] MSW is disabled in production builds (`import.meta.env.MODE !== 'development'` guard).

**STOP — verify all checklist items before continuing.** Tick each one by actually reading
the relevant code, not by assuming the original build was correct.

---

## 3. Build in This Order

### Step 1 — Monorepo Root Structure

Create the root directory layout. Move (don't copy) `frontend/`, `backend/`, and
`ai_service/` into it if they aren't already siblings. Create empty placeholders for
`infra/`, `.github/workflows/`, `Makefile`, and `README.md` — don't fill them yet.

Verify: `ls -1` at the repo root shows exactly `frontend/ backend/ ai_service/ infra/
.github/ Makefile README.md .env.example .gitignore`.

Remove any AI-generated scaffolding files that have no place in a production repo:
- `replit.nix`, `.replit`, `replit.toml`, or any Replit-specific config
- `.aider*`, `.cursor*`, `.continue*`, `copilot-instructions.md`, or similar AI-tool dotfiles
- Any `TODO_AI.md`, `GENERATED_BY_AI.md`, or equivalent
- Any hardcoded API keys or secrets that appear in non-`.env.example` files (rotate them
  immediately if found — treat as compromised)

**STOP — confirm the directory layout is correct and no AI scaffolding files remain.**

---

### Step 2 — Unified Docker Compose (Local Dev)

Create `infra/docker-compose.yml` that brings up all seven services together:

```yaml
# infra/docker-compose.yml
# Local development only. For production, use docker-compose.prod.yml.
# Run from the repo root: docker compose -f infra/docker-compose.yml up

version: "3.9"

services:

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: career_mentor
      POSTGRES_USER: career_mentor
      POSTGRES_PASSWORD: devpassword
    ports: ["5432:5432"]
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U career_mentor"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks: [internal]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    networks: [internal]

  langfuse:
    image: langfuse/langfuse:2
    environment:
      DATABASE_URL: postgres://career_mentor:devpassword@postgres:5432/langfuse
      NEXTAUTH_SECRET: devsecret
      NEXTAUTH_URL: http://localhost:3001
      SALT: devsalt
    ports: ["3001:3000"]   # 3001 on host to avoid clashing with Vite dev server
    depends_on:
      postgres:
        condition: service_healthy
    networks: [internal]

  ai_service:
    build:
      context: ../ai_service
      dockerfile: Dockerfile
    env_file: ../ai_service/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    expose: ["8001"]       # internal only — NOT published to host
    volumes:
      - ../ai_service:/app  # bind mount for hot-reload in dev only
    networks: [internal]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8001/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ../backend
      dockerfile: Dockerfile
    env_file: ../backend/.env
    environment:
      AI_SERVICE_URL: http://ai_service:8001
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      ai_service:
        condition: service_healthy
    expose: ["8000"]
    volumes:
      - ../backend:/app
    networks: [internal]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/"]
      interval: 10s
      timeout: 5s
      retries: 5

  celery_worker:
    build:
      context: ../backend
      dockerfile: Dockerfile
    command: celery -A config worker -l info --concurrency=2
    env_file: ../backend/.env
    environment:
      AI_SERVICE_URL: http://ai_service:8001
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      ai_service:
        condition: service_healthy
    volumes:
      - ../backend:/app
    networks: [internal]

  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: http://localhost/api/v1
        VITE_CLOUDINARY_CLOUD_NAME: ${VITE_CLOUDINARY_CLOUD_NAME}
        VITE_CLOUDINARY_UPLOAD_PRESET: ${VITE_CLOUDINARY_UPLOAD_PRESET}
    ports: ["80:80"]
    depends_on:
      backend:
        condition: service_healthy
    networks: [internal, public]

  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80"]   # in dev, nginx handles routing; see note below
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - backend
      - frontend
    networks: [internal, public]

networks:
  internal:
    driver: bridge
    internal: false   # set true in prod for ai_service isolation
  public:
    driver: bridge

volumes:
  pgdata:
```

> **Dev routing note:** In local dev the `frontend` service builds the static bundle at
> container start, which is slow. For active frontend development, run `npm run dev` from
> `frontend/` directly (Vite dev server on `:5173`) and start only the backend services:
> `docker compose -f infra/docker-compose.yml up postgres redis ai_service backend celery_worker`.
> The Vite proxy config (Step 3) handles `/api/v1` → `localhost:8000` in that mode.

**STOP — run `docker compose -f infra/docker-compose.yml up` and confirm all services
reach `healthy` status. Check `docker compose logs backend` and `docker compose logs
ai_service` for startup errors before continuing.**

---

### Step 3 — Nginx Reverse Proxy

Create `infra/nginx/nginx.conf`. This is the single entry point for all traffic — it routes
`/api/v1/*` to Django and everything else to the React static files. Pay attention to the
SSE-specific headers and the cookie forwarding.

```nginx
# infra/nginx/nginx.conf
# This file handles both local dev (HTTP) and production (HTTPS via docker-compose.prod.yml).
# TLS termination is handled by Certbot/Let's Encrypt or your load balancer in production;
# Nginx here concerns itself only with routing and header correctness.

upstream django {
    server backend:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    # --- Security headers ---
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # CSP is intentionally omitted here and should be set per-environment.
    # Add it in docker-compose.prod.yml or your cloud load balancer config.

    # --- Django REST API ---
    location /api/ {
        proxy_pass http://django;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";    # keepalive
        proxy_read_timeout 120s;           # long enough for async job polling
        proxy_send_timeout 30s;
    }

    # --- SSE: chat streaming endpoint (must NOT be buffered) ---
    location ~ ^/api/v1/chat/sessions/[^/]+/messages/$ {
        proxy_pass http://django;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Critical for SSE — tell Nginx and any upstream proxy not to buffer
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;           # hold open for the full stream duration
        add_header X-Accel-Buffering "no" always;
        add_header Cache-Control "no-cache" always;
    }

    # --- React SPA (static files) ---
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;  # SPA fallback for react-router
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    # Immutable cache for Vite-hashed assets
    location ~* \.(js|css|woff2?|ttf|eot|svg|png|ico)$ {
        root /usr/share/nginx/html;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

Update the `frontend` service's `Dockerfile` to copy the React `dist/` into the Nginx
image that also serves as the reverse proxy, OR keep the frontend and Nginx as separate
containers (simpler in production — one service per responsibility). The architecture
recommended here is **separate containers**: `frontend` serves static files from its own
Nginx, and a separate `nginx` reverse proxy routes to both `backend` and `frontend`.

If you choose separate containers, the Nginx `location /` block should proxy to
`frontend:80` instead of serving files directly:

```nginx
# Alternative: proxy to the frontend container instead of serving files
location / {
    proxy_pass http://frontend:80;
    proxy_set_header Host $host;
}
```

**STOP — manually verify these three things before continuing:**
1. `curl http://localhost/api/v1/health/` returns `200` (Django is reachable through Nginx)
2. `curl http://localhost/` returns the React `index.html` (static files route correctly)
3. Open DevTools → Network → open the chat page → confirm the SSE request has
   `Content-Type: text/event-stream` and messages appear without waiting for the stream to close

---

### Step 4 — Vite Dev Proxy (Frontend-Only Dev Mode)

Add a proxy to `frontend/vite.config.ts` so that when running `npm run dev`, API calls to
`/api/v1/*` are forwarded to the local Django server at `localhost:8000` rather than
hitting `localhost:5173/api` (which doesn't exist). This only applies during local
development — production uses Nginx routing.

```typescript
// frontend/vite.config.ts  (add the server.proxy block)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Do not rewrite the path — Django expects /api/v1/... as-is
      },
    },
  },
  build: {
    sourcemap: false,    // disable in production; enable in staging via env var
  },
});
```

After adding this, test the flow: `npm run dev` → open the login page → submit credentials
→ confirm the `POST /api/v1/auth/login/` request reaches Django (check Django logs).

---

### Step 5 — CORS and Cookie Configuration

This is the most common integration failure point. Both the Django CORS config and the
cookie attributes must match the actual origins in use. Review the following settings in
`backend/config/settings/base.py` and confirm each one:

```python
# backend/config/settings/base.py

# django-cors-headers
CORS_ALLOW_CREDENTIALS = True   # REQUIRED: allows browsers to send cookies cross-origin

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://localhost:80"],
)

# Expose the Authorization header so axios can read it (not strictly needed if
# you're using cookies for refresh and Bearer tokens for auth, but belt-and-suspenders)
CORS_EXPOSE_HEADERS = ["Content-Type", "X-CSRFToken"]

# Tell Django it's behind a TLS-terminating proxy (Nginx or load balancer)
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
```

```python
# backend/apps/users/views.py  (login + register response)
# The refresh token cookie must be set with these exact attributes in production:
response.set_cookie(
    key="refresh_token",
    value=str(refresh),
    httponly=True,
    secure=not settings.DEBUG,       # False in local dev (no HTTPS), True in prod
    samesite="None" if not settings.DEBUG else "Lax",
    # SameSite=None is required for cross-origin cookies (frontend ≠ API domain).
    # SameSite=None MUST be paired with Secure=True — browsers reject it otherwise.
    # In local dev, SameSite=Lax is fine because both run on localhost.
    max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
    path="/api/v1/auth/refresh/",    # Scoped: browser only sends this cookie to the
                                     # refresh endpoint, nowhere else.
)
```

**STOP — open browser DevTools → Application → Cookies after logging in and verify:**
- The `refresh_token` cookie exists
- `HttpOnly` is checked
- `Secure` matches your environment (false in HTTP dev, true in HTTPS prod)
- `SameSite` is `None` in prod / `Lax` in dev
- `Path` is `/api/v1/auth/refresh/`

If any attribute is wrong, fix `set_cookie()` and re-test before continuing.

---

### Step 6 — End-to-End Feature Verification

Run through each feature flow manually against the fully integrated stack (all containers
up via `docker compose`). For each flow, note the network requests in DevTools and confirm
request → response shapes match the API contract in both prompts.

#### 6.1 Auth Flow
```
1. POST /api/v1/auth/register/ → 201, access token in body, refresh cookie set
2. POST /api/v1/auth/login/    → 200, same
3. GET  /api/v1/me/            → 200 with Authorization: Bearer <access_token>
4. Wait 15 minutes (or shorten JWT_ACCESS_TOKEN_LIFETIME_MIN to 1 for testing)
5. Any authenticated request   → interceptor fires, POST /api/v1/auth/refresh/
                                 → 200 { access }, retry original request transparently
6. POST /api/v1/auth/logout/   → 204, refresh cookie cleared
7. GET  /api/v1/me/            → 401 (session gone)
```

#### 6.2 Resume Upload Flow
```
1. Drag PDF onto dropzone → client validates type + size → upload to Cloudinary
2. Cloudinary returns { secure_url, public_id }
3. POST /api/v1/resumes/ { cloudinary_url, cloudinary_public_id, original_filename }
4. Response: 201 Resume { id, status: "uploaded" }
5. Poll GET /api/v1/resumes/{id}/ every 3s → status: "parsing" → "parsed"
6. GET /api/v1/resumes/{id}/analysis/ → 200 ResumeAnalysis (skills, experience, education)
7. Skills visible on Resume page, Careers page unlocked
```
If status stays `uploaded` for > 30 seconds, check Celery worker logs — the task may have
failed silently. Check Django logs for the HMAC-signed call to the AI service.

#### 6.3 Async AI Feature Flows (Career Paths, Job Matches, Learning Roadmap, Interview Qs)
All follow the same pattern:
```
1. POST .../generate/ → 202 { job_id }
2. Poll GET /api/v1/jobs/async-status/{job_id}/ every 2s
3. When status === "done", re-fetch the list endpoint (or read result from status response)
4. Render results
```
Verify that a 429 from Gemini surfaces as a user-readable error state on the page, not a
spinner that never resolves or a silent `undefined`.

#### 6.4 Chat Streaming Flow
```
1. POST /api/v1/chat/sessions/ → 201 { id }
2. POST /api/v1/chat/sessions/{id}/messages/ { content: "..." }
   → Content-Type: text/event-stream
   → tokens arrive as: data: {"token": "Hello"}\n\n
   → stream ends with: data: {"done": true}\n\n
3. Tokens render progressively in the UI as they arrive
4. Final message persisted: GET /api/v1/chat/sessions/{id}/messages/ → shows both turns
```
Confirm in Nginx logs that the SSE connection stays open for the full stream duration and
does not get buffered (responses should appear character-by-character in DevTools, not all
at once at the end).

**STOP — all 4 flows must pass manually before building CI/CD. Green CI on broken
integration is worse than failing CI — it erodes trust in the pipeline.**

---

### Step 7 — GitHub Actions CI Pipeline

Create `.github/workflows/ci.yml`. This runs on every push and pull request. The LLM is
always mocked — no real Gemini calls in CI. Keep the three services' test suites in
separate jobs so failures are localized.

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: [main, staging]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:

  frontend:
    name: Frontend — lint, type-check, test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test -- --run   # Vitest, non-interactive
      - name: Build (verify production bundle compiles)
        run: npm run build
        env:
          VITE_API_BASE_URL: https://api.example.com/api/v1
          VITE_CLOUDINARY_CLOUD_NAME: test
          VITE_CLOUDINARY_UPLOAD_PRESET: test_preset

  backend:
    name: Backend — lint, type-check, test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: career_mentor_test
          POSTGRES_USER: career_mentor
          POSTGRES_PASSWORD: testpassword
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ["6379:6379"]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5
    defaults:
      run:
        working-directory: backend
    env:
      DATABASE_URL: postgres://career_mentor:testpassword@localhost:5432/career_mentor_test
      REDIS_URL: redis://localhost:6379/0
      DJANGO_SETTINGS_MODULE: config.settings.test
      SECRET_KEY: ci-test-secret-key-not-used-in-prod
      AI_SERVICE_URL: http://localhost:8001   # mocked — never called in unit tests
      AI_SERVICE_SHARED_SECRET: ci-test-hmac-secret
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements/dev.txt
      - run: pip install -r requirements/dev.txt
      - run: ruff check .
      - run: mypy .
      - run: pytest --tb=short -q

  ai_service:
    name: AI Service — lint, type-check, test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: career_mentor_test
          POSTGRES_USER: career_mentor
          POSTGRES_PASSWORD: testpassword
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    defaults:
      run:
        working-directory: ai_service
    env:
      DATABASE_URL: postgresql+asyncpg://career_mentor:testpassword@localhost:5432/career_mentor_test
      GOOGLE_API_KEY: ci-placeholder-never-used   # tests mock get_llm() at the boundary
      AI_SERVICE_SHARED_SECRET: ci-test-hmac-secret
      LANGFUSE_PUBLIC_KEY: ci-placeholder
      LANGFUSE_SECRET_KEY: ci-placeholder
      LANGFUSE_HOST: http://localhost:3001         # not started in CI — handler is mocked
      CLOUDINARY_CLOUD_NAME: ci-placeholder
      CLOUDINARY_API_KEY: ci-placeholder
      CLOUDINARY_API_SECRET: ci-placeholder
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: ai_service/requirements.txt
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: mypy .
      - run: pytest --tb=short -q

  docker-build:
    name: Docker — verify all images build
    runs-on: ubuntu-latest
    needs: [frontend, backend, ai_service]
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - name: Build frontend image
        uses: docker/build-push-action@v5
        with:
          context: frontend
          push: false
          build-args: |
            VITE_API_BASE_URL=https://api.example.com/api/v1
            VITE_CLOUDINARY_CLOUD_NAME=test
            VITE_CLOUDINARY_UPLOAD_PRESET=test_preset
      - name: Build backend image
        uses: docker/build-push-action@v5
        with:
          context: backend
          push: false
      - name: Build ai_service image
        uses: docker/build-push-action@v5
        with:
          context: ai_service
          push: false
```

---

### Step 8 — CD: Staging Deployment

Create `.github/workflows/cd-staging.yml`. This runs on merge to `main`, builds and
pushes Docker images to your container registry, and deploys to a staging environment.
Fill in the deployment steps for your specific hosting platform (Railway, Render, Fly.io,
a VPS with Docker — they all follow the same shape).

```yaml
# .github/workflows/cd-staging.yml
name: CD — Staging

on:
  push:
    branches: [main]

jobs:
  build-and-push:
    name: Build and push images
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    outputs:
      image_tag: ${{ steps.meta.outputs.version }}
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: Log in to container registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract image metadata
        id: meta
        run: echo "version=sha-$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT

      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:${{ steps.meta.outputs.version }}
          build-args: |
            VITE_API_BASE_URL=${{ secrets.STAGING_API_BASE_URL }}
            VITE_CLOUDINARY_CLOUD_NAME=${{ secrets.CLOUDINARY_CLOUD_NAME }}
            VITE_CLOUDINARY_UPLOAD_PRESET=${{ secrets.CLOUDINARY_UPLOAD_PRESET }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:${{ steps.meta.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push ai_service
        uses: docker/build-push-action@v5
        with:
          context: ai_service
          push: true
          tags: ghcr.io/${{ github.repository }}/ai_service:${{ steps.meta.outputs.version }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    name: Deploy to staging
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: staging
    steps:
      - uses: actions/checkout@v4
      # ── Replace the step below with your platform-specific deploy command ──
      # Examples:
      #   Railway:  railway up --service backend --image ghcr.io/.../backend:$TAG
      #   Fly.io:   fly deploy --image ghcr.io/.../backend:$TAG --app career-mentor-backend-staging
      #   VPS SSH:  ssh deploy@staging.yourdomain.com "cd /app && docker compose pull && docker compose up -d"
      - name: Deploy (replace with your platform)
        run: |
          echo "Deploy image tag ${{ needs.build-and-push.outputs.image_tag }} to staging"
          echo "Add your platform-specific deploy command here."
          # Document which secrets this step requires and add them in
          # Settings → Environments → staging → Secrets.
```

---

### Step 9 — CD: Production Deployment (Manual Approval Required)

```yaml
# .github/workflows/cd-prod.yml
name: CD — Production

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Image tag to promote (e.g. sha-abc1234)"
        required: true

jobs:
  deploy-prod:
    name: Deploy to production
    runs-on: ubuntu-latest
    environment: production    # requires manual approval in GitHub Environments settings
    steps:
      - name: Log in to container registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Deploy backend
        run: |
          echo "Deploying backend:${{ github.event.inputs.image_tag }} to production"
          # Replace with your platform-specific command
          # VPS example:
          # ssh deploy@api.yourdomain.com \
          #   "IMAGE_TAG=${{ github.event.inputs.image_tag }} docker compose -f /app/infra/docker-compose.prod.yml up -d backend celery_worker"

      - name: Deploy ai_service
        run: |
          echo "Deploying ai_service:${{ github.event.inputs.image_tag }} to production"

      - name: Deploy frontend
        run: |
          echo "Deploying frontend:${{ github.event.inputs.image_tag }} to production"

      - name: Run post-deploy migrations
        run: |
          echo "Run: docker compose exec backend python manage.py migrate --noinput"
          # Automate this or make it a separate manual step — never skip it
```

Configure `Settings → Environments → production` to require a named reviewer's approval
before this workflow runs. This is the minimum gate for a production deploy.

---

### Step 10 — Nightly Golden Tests (Real Gemini API)

```yaml
# .github/workflows/golden-tests.yml
name: Golden Tests (real Gemini API, nightly)

on:
  schedule:
    - cron: "0 2 * * *"   # 2 AM UTC — off-peak, lower chance of hitting 429s
  workflow_dispatch:       # also triggerable manually

jobs:
  golden:
    name: Real-model agent smoke tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: career_mentor_test
          POSTGRES_USER: career_mentor
          POSTGRES_PASSWORD: testpassword
        ports: ["5432:5432"]
        options: --health-cmd pg_isready --health-interval 5s --health-retries 5
    defaults:
      run:
        working-directory: ai_service
    env:
      DATABASE_URL: postgresql+asyncpg://career_mentor:testpassword@localhost:5432/career_mentor_test
      GOOGLE_API_KEY: ${{ secrets.GEMINI_API_KEY_CI }}   # a separate free-tier key for CI
      AI_SERVICE_SHARED_SECRET: ${{ secrets.AI_SERVICE_SHARED_SECRET }}
      LANGFUSE_PUBLIC_KEY: ${{ secrets.LANGFUSE_PUBLIC_KEY }}
      LANGFUSE_SECRET_KEY: ${{ secrets.LANGFUSE_SECRET_KEY }}
      LANGFUSE_HOST: ${{ secrets.LANGFUSE_HOST }}
      CLOUDINARY_CLOUD_NAME: ${{ secrets.CLOUDINARY_CLOUD_NAME }}
      CLOUDINARY_API_KEY: ${{ secrets.CLOUDINARY_API_KEY }}
      CLOUDINARY_API_SECRET: ${{ secrets.CLOUDINARY_API_SECRET }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: ai_service/requirements.txt
      - run: pip install -r requirements.txt
      - name: Run golden test suite
        run: pytest tests/golden/ -v --tb=short
        # Golden tests are expected to occasionally fail with 429 from the free tier.
        # That is not a bug — it means the nightly rate limiter test is working correctly.
        # Check for consistent failure across multiple nights before treating it as a
        # real breakage. Use pytest-retry for individual test resilience.
        continue-on-error: true   # don't fail the workflow on 429s — alert separately
```

---

### Step 11 — Production Docker Compose Overrides

Create `infra/docker-compose.prod.yml`. This is the override file for production — it
removes bind mounts, pins image tags, and enforces network isolation for the AI service.

```yaml
# infra/docker-compose.prod.yml
# Usage: docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml up -d

version: "3.9"

services:

  postgres:
    image: pgvector/pgvector:pg16    # pin exact tag before deploy
    volumes:
      - pgdata:/var/lib/postgresql/data   # named volume only; no bind mounts

  ai_service:
    image: ghcr.io/${GITHUB_REPOSITORY}/ai_service:${IMAGE_TAG}
    volumes: []    # no bind mounts in prod
    networks:
      - internal   # NOT in the public network — unreachable from outside the cluster

  backend:
    image: ghcr.io/${GITHUB_REPOSITORY}/backend:${IMAGE_TAG}
    volumes: []
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.prod
      DEBUG: "False"

  celery_worker:
    image: ghcr.io/${GITHUB_REPOSITORY}/backend:${IMAGE_TAG}
    volumes: []
    environment:
      DJANGO_SETTINGS_MODULE: config.settings.prod

  frontend:
    image: ghcr.io/${GITHUB_REPOSITORY}/frontend:${IMAGE_TAG}
    volumes: []

  nginx:
    volumes:
      - ./nginx/nginx.prod.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro   # mount TLS certs from Certbot/Let's Encrypt

networks:
  internal:
    internal: true    # ai_service is truly air-gapped from the public network
```

---

### Step 12 — Makefile (Convenience Targets)

```makefile
# Makefile — run from the repo root

.PHONY: up down logs test lint migrate shell-backend shell-ai help

COMPOSE = docker compose -f infra/docker-compose.yml
COMPOSE_PROD = $(COMPOSE) -f infra/docker-compose.prod.yml

up:               ## Start all services (local dev)
	$(COMPOSE) up --build

up-d:             ## Start all services in background
	$(COMPOSE) up --build -d

down:             ## Stop and remove containers
	$(COMPOSE) down

logs:             ## Tail logs for all services
	$(COMPOSE) logs -f

test-frontend:    ## Run frontend tests
	cd frontend && npm run test -- --run

test-backend:     ## Run backend tests (requires postgres + redis running)
	cd backend && pytest --tb=short -q

test-ai:          ## Run AI service tests (requires postgres running)
	cd ai_service && pytest --tb=short -q

test:             ## Run all tests
	$(MAKE) test-frontend test-backend test-ai

lint:             ## Lint all services
	cd frontend && npm run lint
	cd backend && ruff check .
	cd ai_service && ruff check .

migrate:          ## Run Django migrations
	$(COMPOSE) exec backend python manage.py migrate --noinput

createsuperuser:  ## Create a Django superuser
	$(COMPOSE) exec backend python manage.py createsuperuser

shell-backend:    ## Django shell
	$(COMPOSE) exec backend python manage.py shell

shell-ai:         ## AI service container shell
	$(COMPOSE) exec ai_service bash

help:             ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
```

---

### Step 13 — Environment Variable Reference (Root `.env.example`)

```bash
# .env.example — monorepo root
# Copy to .env and fill in values. Never commit .env.
# Each service also has its own .env.example — this file documents the full picture.

# ── Django backend ──────────────────────────────────────────────────────────────
DJANGO_SETTINGS_MODULE=config.settings.prod
SECRET_KEY=                          # generate: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DEBUG=False
ALLOWED_HOSTS=api.yourdomain.com,backend
CORS_ALLOWED_ORIGINS=https://yourdomain.com
DATABASE_URL=postgres://career_mentor:CHANGE_ME@postgres:5432/career_mentor
REDIS_URL=redis://redis:6379/0
AI_SERVICE_URL=http://ai_service:8001
AI_SERVICE_SHARED_SECRET=            # generate: openssl rand -hex 32
JWT_ACCESS_TOKEN_LIFETIME_MIN=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
SENTRY_DSN=                          # optional; leave blank to disable

# ── FastAPI AI service ──────────────────────────────────────────────────────────
GOOGLE_API_KEY=                      # from Google AI Studio — keep billing DISABLED on this project
GEMINI_DEFAULT_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash-lite
# DATABASE_URL same as Django (shared Postgres instance)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=http://langfuse:3001   # self-hosted; or https://cloud.langfuse.com
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=               # server-side only — never sent to browser
LOG_LEVEL=INFO

# ── React frontend (build-time, safe to expose) ────────────────────────────────
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
VITE_CLOUDINARY_CLOUD_NAME=          # same as CLOUDINARY_CLOUD_NAME above
VITE_CLOUDINARY_UPLOAD_PRESET=       # unsigned preset restricted to raw/pdf/docx in Cloudinary dashboard

# ── CI/CD (GitHub Actions secrets) ────────────────────────────────────────────
# Add these in Settings → Secrets and variables → Actions:
#   STAGING_API_BASE_URL
#   GEMINI_API_KEY_CI        (separate free-tier key, billing disabled, for golden tests)
#   CLOUDINARY_CLOUD_NAME
#   CLOUDINARY_UPLOAD_PRESET
#   CLOUDINARY_API_KEY
#   CLOUDINARY_API_SECRET
#   LANGFUSE_PUBLIC_KEY
#   LANGFUSE_SECRET_KEY
#   LANGFUSE_HOST
#   AI_SERVICE_SHARED_SECRET
```

---

## 4. Security Checklist (Integration-Specific)

Work through this list after all services are running end-to-end. Fix before declaring
integration complete.

- [ ] `AI_SERVICE_SHARED_SECRET` is never logged anywhere (check Django's request logger
      and the FastAPI access logger — the `Authorization` / `X-Signature` headers that carry
      the HMAC must be scrubbed)
- [ ] The `ai_service` container has no published port in `docker-compose.prod.yml` and
      is only on the `internal` network
- [ ] Refresh cookie has `HttpOnly`, `Secure`, `SameSite=None` in production (verify in
      DevTools after logging in through the production Nginx, not just the dev stack)
- [ ] `VITE_API_BASE_URL` and the two Cloudinary public values are the only secrets in
      the frontend bundle — run `grep -r "SECRET\|PASSWORD\|API_KEY" frontend/dist/` and
      confirm zero matches before deploying
- [ ] Nginx does not forward `X-Real-IP` or `X-Forwarded-For` from untrusted sources
      (fine on a single-host VPS; if behind a CDN, pin the CDN's IP range)
- [ ] Django's `DEBUG=False` in production — a `DEBUG=True` leak exposes your entire
      settings module in error pages
- [ ] `GOOGLE_API_KEY` is not in any log line — add a log scrubber or use Django's
      `LOGGING` `filters` to redact `GOOGLE_API_KEY` if it could appear in tracebacks
- [ ] The Langfuse dashboard (port 3001) is not publicly accessible without authentication
- [ ] `npm audit` passes (or all flagged issues are accepted with a documented reason) in CI
- [ ] `pip-audit` passes for both `backend/` and `ai_service/` requirements

---

## 5. README.md (Production-Grade)

The README must include all of the following sections — write them for a new engineer
who has never seen this codebase:

1. **Project Overview** — what the product does, who it's for, what makes it technically
   interesting (agentic AI with LangGraph, free-tier stack, SSE streaming)
2. **Architecture Diagram** — text or Mermaid diagram showing Browser → Nginx → Django →
   AI Service → Gemini, and the Cloudinary direct upload path
3. **Local Development Setup** — exact commands from `git clone` to `make up`, including
   prerequisites (Docker, Node 20, Python 3.12) and how to get each required external
   credential (Gemini API key, Cloudinary account, Langfuse)
4. **Environment Variables** — table of every variable, whether it's required, and where
   to get its value
5. **Running Tests** — `make test` and what each service's suite covers; how to run golden
   tests manually and what a 429 failure means
6. **Project Structure** — annotated directory tree explaining each top-level folder
7. **API Reference** — link to the OpenAPI docs served by Django (`/api/v1/schema/swagger-ui/`)
   and FastAPI (`/docs`) when running locally
8. **Deployment Guide** — how to deploy to staging (merge to `main`) and production
   (manual `cd-prod.yml` dispatch), what GitHub secrets to configure, and how to run
   migrations post-deploy
9. **Free-Tier Constraints** — explicit documentation of the Gemini RPM/RPD limits,
   Cloudinary storage cap, and how the system degrades gracefully at each limit
10. **Contributing** — branch naming, PR expectations, the `STOP` checkpoint discipline

---

## 6. Definition of Done for Integration

The integration is complete when **all** of the following are true — not "most of them" or
"all except the ones that are hard":

- [ ] `make up` from a clean checkout (no `.env` files except the filled-in `.env`)
      brings all 7 services to healthy within 3 minutes
- [ ] All 4 feature flows in Step 6 pass manually end-to-end through the full container
      stack (not against Vite dev server + direct localhost:8000)
- [ ] `make test` (all three services) passes in under 5 minutes with no real Gemini calls
- [ ] All CI jobs in `ci.yml` pass on a fresh branch push
- [ ] `docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml config`
      produces a valid compose file with no bind mounts and `ai_service` on the internal
      network only
- [ ] All items in the Security Checklist (Section 4) are ticked
- [ ] The README covers all 10 sections in Section 5 and is readable by someone new to
      the codebase
- [ ] No AI scaffolding files (`replit.*`, `.aider*`, `TODO_AI.md`, etc.) remain in the repo
- [ ] `git log --oneline` reflects incremental, reviewable commits — not "add all files"
      as a single commit

---

## 7. Ongoing Maintenance Notes

These are not integration tasks, but document them so they don't get forgotten:

- **Gemini model names change.** `gemini-2.5-flash` may be renamed or replaced. Put the
  model name in `GEMINI_DEFAULT_MODEL` env var (already done in the spec) and update it
  without a code change when Google updates the name.
- **Free-tier limits change.** Google adjusts RPM/RPD caps without notice. The
  `GeminiClient` rate limiter uses a configurable limit (not a hardcoded number) — check
  Google AI Studio's current limits quarterly and update the env var, not the code.
- **Langfuse versions drift.** Pin the `langfuse/langfuse:2` image tag to a specific minor
  version before going to production; `langfuse/langfuse:2` is a floating tag and may
  break on a surprise update.
- **pgvector index tuning.** The IVFFlat index performs poorly with fewer than ~1000 rows.
  Leave exact-scan in place until the `job_listings` table reaches that threshold, then
  switch to the indexed path. Document this threshold in a migration comment.
- **Rotate `AI_SERVICE_SHARED_SECRET` periodically.** It's a long-lived secret that protects
  the AI service from unauthenticated calls. Rotate it like any API key — at least annually
  or immediately after a suspected compromise.
