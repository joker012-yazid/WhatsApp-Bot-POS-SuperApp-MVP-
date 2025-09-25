COMPOSE ?= docker compose

.PHONY: up down logs prisma seed

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

prisma:
	$(COMPOSE) exec api npx prisma migrate deploy

seed:
	$(COMPOSE) exec api npx prisma db seed
