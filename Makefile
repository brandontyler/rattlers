.PHONY: help install dev test deploy clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies..."
	cd backend && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt -r requirements-dev.txt
	@echo "Installing infrastructure dependencies..."
	cd infrastructure && python -m venv venv && . venv/bin/activate && pip install -r requirements.txt

dev-frontend: ## Start frontend development server
	cd frontend && npm run dev

dev-backend: ## Run backend tests in watch mode
	cd backend && . venv/bin/activate && pytest-watch

test-frontend: ## Run frontend tests
	cd frontend && npm test

test-backend: ## Run backend tests
	cd backend && . venv/bin/activate && pytest

test: test-frontend test-backend ## Run all tests

lint-frontend: ## Lint frontend code
	cd frontend && npm run lint

lint-backend: ## Lint backend code
	cd backend && . venv/bin/activate && black . && flake8

lint: lint-frontend lint-backend ## Lint all code

deploy-dev: ## Deploy to development environment
	./scripts/deploy.sh dev

deploy-prod: ## Deploy to production environment
	./scripts/deploy.sh prod

cdk-diff: ## Show CDK stack differences
	cd infrastructure && . venv/bin/activate && cdk diff

cdk-synth: ## Synthesize CDK stack
	cd infrastructure && . venv/bin/activate && cdk synth

clean: ## Clean build artifacts and caches
	@echo "Cleaning frontend..."
	cd frontend && rm -rf node_modules dist
	@echo "Cleaning backend..."
	cd backend && rm -rf venv __pycache__ .pytest_cache
	@echo "Cleaning infrastructure..."
	cd infrastructure && rm -rf venv cdk.out
	@echo "Done!"
