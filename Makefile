## AI Career Mentor — Makefile convenience targets
## Run from the repo root.

COMPOSE = docker compose -f infra/docker-compose.yml

.PHONY: up down logs test lint migrate createsuperuser shell-backend shell-ai help

up:           ## Start all services (postgres, redis, ai_service, backend, celery, frontend, nginx)
	$(COMPOSE) up -d
	@echo "Stack is up. Frontend → http://localhost  API → http://localhost/api/v1/"

down:         ## Stop and remove containers (data volumes are preserved)
	$(COMPOSE) down

logs:         ## Tail logs from all services (Ctrl-C to stop)
	$(COMPOSE) logs -f

logs-backend: ## Tail Django backend logs only
	$(COMPOSE) logs -f backend

logs-ai:      ## Tail AI service logs only
	$(COMPOSE) logs -f ai_service

test:         ## Run all three service test suites (LLM mocked, no real API calls)
	@echo "--- Django backend tests ---"
	cd backend && pytest tests/ -v
	@echo "--- AI service tests ---"
	cd ai_service && pytest tests/ -v
	@echo "--- Frontend tests ---"
	cd frontend && pnpm test --run

lint:         ## Lint all services
	cd frontend && pnpm run lint
	cd backend && ruff check .
	cd ai_service && ruff check .

migrate:      ## Run Django migrations
	$(COMPOSE) exec backend python manage.py migrate --noinput

createsuperuser: ## Create a Django superuser
	$(COMPOSE) exec backend python manage.py createsuperuser

shell-backend: ## Django shell
	$(COMPOSE) exec backend python manage.py shell

shell-ai:     ## AI service container shell
	$(COMPOSE) exec ai_service bash

help:         ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
