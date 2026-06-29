## AI Career Mentor — Makefile convenience targets
## Run from the repo root.

COMPOSE      = docker compose -f infra/docker-compose.yml
COMPOSE_PROD = $(COMPOSE) -f infra/docker-compose.prod.yml

.PHONY: up up-d down logs logs-backend logs-ai \
        test test-frontend test-backend test-ai \
        lint migrate createsuperuser \
        shell-backend shell-ai help

up:              ## Start all services in foreground (dev)
	$(COMPOSE) up --build

up-d:            ## Start all services in background (dev)
	$(COMPOSE) up --build -d
	@echo "Stack is up. Frontend → http://localhost  API → http://localhost/api/v1/"

down:            ## Stop and remove containers (data volumes are preserved)
	$(COMPOSE) down

logs:            ## Tail logs from all services (Ctrl-C to stop)
	$(COMPOSE) logs -f

logs-backend:    ## Tail Django backend logs only
	$(COMPOSE) logs -f backend

logs-ai:         ## Tail AI service logs only
	$(COMPOSE) logs -f ai_service

test-frontend:   ## Run frontend tests (Vitest + MSW — no real API calls)
	cd frontend && pnpm test --run

test-backend:    ## Run backend tests (LLM mocked — requires postgres + redis)
	cd backend && pytest --tb=short -q

test-ai:         ## Run AI service tests (LLM mocked — requires postgres)
	cd ai_service && pytest --tb=short -q

test:            ## Run all three service test suites (LLM mocked, no real API calls)
	@echo "--- Frontend tests ---"
	$(MAKE) test-frontend
	@echo "--- Django backend tests ---"
	$(MAKE) test-backend
	@echo "--- AI service tests ---"
	$(MAKE) test-ai

lint:            ## Lint all services
	cd frontend && pnpm run lint
	cd backend && ruff check .
	cd ai_service && ruff check .

migrate:         ## Run Django migrations
	$(COMPOSE) exec backend python manage.py migrate --noinput

createsuperuser: ## Create a Django superuser
	$(COMPOSE) exec backend python manage.py createsuperuser

shell-backend:   ## Django shell
	$(COMPOSE) exec backend python manage.py shell

shell-ai:        ## AI service container shell
	$(COMPOSE) exec ai_service bash

help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
