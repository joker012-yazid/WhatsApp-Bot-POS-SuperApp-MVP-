PNPM=pnpm

install:
	$(PNPM) install

build:
	$(PNPM) build

dev:
	$(PNPM) dev

lint:
	$(PNPM) lint

test:
	$(PNPM) test

migrate:
	$(PNPM) prisma:migrate

seed:
	$(PNPM) prisma:seed

prisma: migrate seed

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

logs:
	docker compose logs -f
