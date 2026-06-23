# Makefile — boots and manages the IPTV Play monorepo.
#   frontend/  React 19 + Vite SPA   (http://localhost:5173)
#   backend/   Go UDP->HLS bridge    (http://localhost:8080)
# The backend needs Go + ffmpeg on PATH, and the UDP multicast network for
# udp:// channels. The frontend's default (Option A) playlist needs no backend.
# Run `make` or `make help` for targets. Frontend needs pnpm (corepack enable).

SHELL := bash
.DEFAULT_GOAL := help

.PHONY: help install dev dev-frontend dev-backend build build-frontend build-backend \
        lint type-check test check clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install frontend dependencies (frozen lockfile)
	pnpm -C frontend install --frozen-lockfile

dev: ## Start BOTH services (frontend :5173 + backend :8080); Ctrl-C stops both
	@echo "▶ frontend → http://localhost:5173    ▶ backend → http://localhost:8080"
	@echo "  Ctrl-C stops both. (Backend needs Go + ffmpeg; udp:// needs the UDP multicast network.)"
	@trap 'kill 0' EXIT INT TERM; \
		pnpm -C frontend dev & \
		( set -a; [ -f .env ] && . ./.env; set +a; cd backend && go run . ) & \
		wait

dev-frontend: ## Start only the frontend (Vite, :5173)
	pnpm -C frontend dev

dev-backend: ## Start only the backend (Go bridge, :8080)
	set -a; [ -f .env ] && . ./.env; set +a; cd backend && go run .

build: build-frontend build-backend ## Build both frontend and backend

build-frontend: ## Production build of the frontend (frontend/dist/)
	pnpm -C frontend build

build-backend: ## Compile the Go backend to backend/iptv-bridge
	cd backend && go build -o iptv-bridge .

lint: ## Lint the frontend
	pnpm -C frontend lint

type-check: ## Type-check the frontend
	pnpm -C frontend type-check

test: ## Run the frontend test suite
	pnpm -C frontend test

check: ## Frontend lint + type-check + test (mirrors CI)
	pnpm -C frontend lint && pnpm -C frontend type-check && pnpm -C frontend test

clean: ## Remove build artifacts
	rm -rf frontend/dist frontend/coverage backend/iptv-bridge
