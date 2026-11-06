'use strict';

/**
 * Ponto de entrada da API.
 * Estrutura:
 *   config/        variáveis de ambiente, conexão MySQL, cliente S3
 *   routes/        mapeamento URL -> controller
 *   controllers/   camada HTTP (lê req, chama service, monta res)
 *   services/      regras de negócio (DJEN, overview, fila de download)
 *   repositories/  SQL
 *   middlewares/   autenticação, rate limit, tratamento de erros
 *   utils/         helpers
 */

const config = require('./config');
const logger = require('./utils/logger');
const { criarApp } = require('./app');
const { pool, aguardarBanco, verificarSchema } = require('./config/database');
const { garantirBucket } = require('./config/storage');

async function iniciar() {
  await aguardarBanco();
  await verificarSchema();
  await garantirBucket();

  const app = criarApp();
  const servidor = app.listen(config.porta, () => {
    logger.info(`API ouvindo na porta ${config.porta} (DJEN ${config.djen.mock ? 'MOCK' : config.djen.baseUrl})`);
  });

  const encerrar = (sinal) => {
    logger.info(`${sinal} recebido, encerrando...`);
    servidor.close(async () => {
      await pool.end().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => encerrar('SIGTERM'));
  process.on('SIGINT', () => encerrar('SIGINT'));
}

iniciar().catch((err) => {
  logger.error('Falha ao iniciar a API', err);
  process.exit(1);
});
