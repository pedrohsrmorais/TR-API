# TR-API

Consulta rápida e download da íntegra de processos judiciais.

Fluxo: **login → número do processo → identificação do tribunal + overview do DJEN → (se quiser) baixar a íntegra → "Meus processos"**.

Fase atual: **Justiça do Trabalho (24 TRTs)**. Os demais ramos já são identificados (mapa completo do CNJ), mas o download só é liberado para o segmento 5.

## Subir

```bash
git clone https://github.com/pedrohsrmorais/TR-API.git
cd TR-API
docker compose up -d --build      # ou: make up
```

| O quê | Onde |
|---|---|
| Aplicação (front + API) | http://localhost:3041 |
| API direta (via nginx) | http://localhost:3041/api/health |
| Console do MinIO | http://localhost:9001 (`minioadmin` / `minioadmin123`) |
| MySQL (client externo) | `localhost:3307`, banco `tr_api`, usuário `tr_api` / `tr_api_dev` |

Usuário inicial: `admin@intellsn.com.br` (o hash da senha está no `database/init.sql`).

Não precisa de `.env` para subir. Para mudar algo, copie `.env.example` para `.env`.

> **Primeiro build demora** (alguns minutos): o MinIO é compilado a partir do código-fonte oficial e o worker baixa o Chromium. Ver [docs/armazenamento.md](docs/armazenamento.md).

### Mudou o schema do banco?

O `database/init.sql` é a **fonte única** do schema e só roda com o volume vazio. Depois de um `git pull` que mexeu nele:

```bash
make reset    # = docker compose down -v && docker compose up -d --build  (APAGA os dados)
```

O backend avisa no log quando a versão do banco não bate com a do código.

## Estrutura

```
.
├── backend/            API Node/Express (server.js, routes, controllers, services, repositories, middlewares)
├── worker/             Robô: consome a fila, baixa a íntegra (Playwright), envia ao S3
│   └── adapters/       um adapter por sistema de tribunal (pje-jt = todos os TRTs)
├── frontend/           HTML/CSS/JS estático + nginx (proxy de /api para o backend)
├── shared/             código comum ao backend e ao worker
│   ├── cnj.js          parser/validador do número CNJ
│   ├── tribunais.js    identificação do tribunal
│   └── tribunais/mapa_tribunais_cnj_brasil.json
├── database/init.sql   schema completo + seed (sempre o estado atual)
├── infra/minio/        Dockerfile do MinIO (build a partir do fonte)
├── docs/               documentação
└── docker-compose.yml
```

## Comandos

```bash
make up       # sobe tudo
make logs     # logs de backend e worker
make reset    # zera banco e arquivos
make test     # testes unitários (sem Docker)
make mysql    # client MySQL no container
docker compose up -d --scale worker=3   # mais robôs em paralelo
```

## Modo simulação

Por padrão o worker roda com `WORKER_SIMULACAO=true`: em vez de acessar o tribunal, gera um PDF marcado como **SIMULADO**. Isso permite testar o fluxo inteiro (fila → S3 → banco → Meus processos → download) antes dos robôs reais estarem prontos. Para usar os robôs reais: `WORKER_SIMULACAO=false`.

## Documentação

- [Arquitetura](docs/arquitetura.md)
- [API](docs/api.md)
- [Banco de dados](docs/banco-de-dados.md)
- [DJEN](docs/djen.md)
- [Worker e adapters](docs/worker.md)
- [Mapa de tribunais](docs/tribunais.md)
- [Armazenamento (MinIO / S3)](docs/armazenamento.md)
