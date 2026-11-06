.PHONY: up down logs ps reset build test mysql

up:            ## sobe tudo (build incluso)
	docker compose up -d --build

down:          ## para tudo, mantendo os dados
	docker compose down

reset:         ## APAGA banco e arquivos e sobe do zero (reaplica o database/init.sql)
	docker compose down -v
	docker compose up -d --build

logs:          ## acompanha logs de backend e worker
	docker compose logs -f backend worker

ps:
	docker compose ps

build:
	docker compose build

test:          ## testes unitários (sem Docker)
	cd backend && npm test
	cd worker && npm test

mysql:         ## abre o client MySQL dentro do container
	docker compose exec mysql sh -c 'mysql -u"$$MYSQL_USER" -p"$$MYSQL_PASSWORD" tr_api'
