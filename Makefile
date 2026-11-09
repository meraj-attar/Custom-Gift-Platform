.PHONY: dev backend frontend test build docker-up docker-down

dev:
	docker compose up --build

backend:
	cd backend && uvicorn app.main:app --reload

frontend:
	cd frontend && npm run dev

test:
	cd backend && pytest -q

build:
	cd frontend && npm run build

docker-up:
	docker compose up --build

docker-down:
	docker compose down
