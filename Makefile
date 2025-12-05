SHELL := /bin/sh

.PHONY: help compose-build compose-up compose-down compose-logs compose-logs-backend compose-logs-worker compose-ps migrate seed health menu validate-local e2e

help:
	@echo "Available targets:"
	@echo "  compose-build       Build all Docker images"
	@echo "  compose-up          Start stack in background"
	@echo "  compose-down        Stop stack and remove containers"
	@echo "  compose-logs        Tail all service logs"
	@echo "  compose-logs-backend Tail backend logs"
	@echo "  compose-logs-worker  Tail worker logs"
	@echo "  compose-ps          Show service status"
	@echo "  migrate             Run Prisma migrate deploy in backend"
	@echo "  seed                Run DB seed in backend"
	@echo "  health              Curl backend health endpoint"
	@echo "  menu                Curl backend menu endpoint"
	@echo "  validate-local      Run local Node smoke validation (no Docker)"
	@echo "  e2e                 Run local E2E (migrate+seed+validate)"
	@echo "  prod-up             Start production stack (Caddy TLS, backend, worker, redis, frontend)"
	@echo "  prod-down           Stop production stack"
	@echo "  prod-logs           Tail production logs"

compose-build:
	docker compose build

compose-up:
	docker compose up -d

compose-down:
	docker compose down -v

compose-logs:
	docker compose logs -f

compose-logs-backend:
	docker compose logs -f backend

compose-logs-worker:
	docker compose logs -f worker

compose-ps:
	docker compose ps

migrate:
	docker compose exec backend npx prisma migrate deploy

seed:
	docker compose exec backend node prisma/seed.js

health:
	curl -fsS http://localhost:5050/healthz || true

menu:
	curl -fsS http://localhost:5050/api/corporate/menu || true

validate-local:
	cd backend && node validate.js

e2e:
	cd backend && \
	  export DATABASE_URL="file:./prisma/dev-e2e.db" && \
	  npx prisma generate && \
	  npx prisma migrate deploy && \
	  node prisma/seed.js && \
	  node validate.js

prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml --env-file .env down -v

prod-logs:
	docker compose -f docker-compose.prod.yml --env-file .env logs -f
