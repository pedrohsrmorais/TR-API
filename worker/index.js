'use strict';

/**
 * Worker do TR-API.
 * Loop: libera jobs travados -> reserva o próximo pendente -> processa -> repete.
 * Escala horizontal: `docker compose up -d --scale worker=3`.
 */

const config = require('./config');
const logger = require('./utils/logger');
const { pool, aguardarBanco, esperar } = require('./config/database');
const fila = require('./services/fila.service');
const { processar } = require('./services/processamento.service');

let rodando = true;

async function ciclo() {
  const liberados = await fila.liberarTravados();
  if (liberados) logger.warn(`${liberados} job(s) travado(s) devolvido(s) para a fila.`);

  const job = await fila.reservarProximo(config.workerId);
  if (!job) return false;

  await processar(job);
  return true;
}

async function main() {
  await aguardarBanco();
  logger.info(
    `Worker ${config.workerId} iniciado (modo ${config.simulacao ? 'SIMULAÇÃO' : 'REAL'}, intervalo ${config.intervaloMs} ms).`
  );

  while (rodando) {
    try {
      const trabalhou = await ciclo();
      if (!trabalhou) await esperar(config.intervaloMs);
    } catch (err) {
      logger.error(`Erro no ciclo do worker: ${err.message}`, err);
      await esperar(config.intervaloMs);
    }
  }

  await pool.end().catch(() => {});
  logger.info('Worker encerrado.');
  process.exit(0);
}

const parar = (sinal) => {
  if (!rodando) return;
  logger.info(`${sinal} recebido: termino o job atual e encerro.`);
  rodando = false;
  setTimeout(() => process.exit(1), config.timeoutJobMs + 10000).unref();
};
process.on('SIGTERM', () => parar('SIGTERM'));
process.on('SIGINT', () => parar('SIGINT'));

main().catch((err) => {
  logger.error('Falha ao iniciar o worker', err);
  process.exit(1);
});
