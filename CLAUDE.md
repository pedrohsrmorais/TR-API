# TR-API: regras do projeto

- Idioma: código, nomes de variáveis, tabelas, logs e docs em **português**.
- `database/init.sql` é a fonte única do schema e deve SEMPRE refletir o estado atual completo do banco.
  Ao mudar o schema: edite o init.sql, acrescente uma linha em `schema_info` com nova versão e atualize
  `schemaVersaoEsperada` em `backend/config/index.js`. Não criar arquivos de migration separados.
- Objetivo de operação: `git pull && docker compose up -d --build` deixa a aplicação funcional (com `make reset` quando o schema mudou).
- Backend: `server.js` na raiz + `config/`, `routes/`, `controllers/`, `services/`, `repositories/`, `middlewares/`, `utils/`.
  Controllers finos; regra de negócio em services; SQL só em repositories. Express 5 (erros async vão sozinhos para o errorHandler).
  Erros esperados usam `utils/AppError`.
- Código compartilhado entre backend e worker fica em `shared/` (Dockerfiles usam a raiz como contexto).
- Armazenamento: sempre via AWS SDK v3 (S3 puro). Nada específico de MinIO no código.
- Worker: um adapter por sistema de tribunal em `worker/adapters/<nome>/`; seletores em `seletores.js`,
  etapas em `etapas.js`. O adapter só gera arquivos no diretório temporário: upload/banco/vínculo é do `processamento.service`.
- Escopo atual: Justiça do Trabalho (segmento 5, 24 TRTs). Outros ramos só depois de todos os TRTs baixarem a íntegra.
- Testes: `node --test` (sem framework). `make test`.
