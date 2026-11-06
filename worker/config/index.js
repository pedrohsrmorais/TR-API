'use strict';

const os = require('os');

const num = (v, padrao) => (v === undefined || v === '' ? padrao : Number(v));
const bool = (v, padrao) => (v === undefined || v === '' ? padrao : ['1', 'true', 'sim', 'yes'].includes(String(v).toLowerCase()));

module.exports = {
  ambiente: process.env.NODE_ENV || 'development',
  workerId: process.env.WORKER_ID || `${os.hostname()}-${process.pid}`,

  // true = não acessa tribunal nenhum, gera um PDF simulado (para testar o fluxo inteiro)
  simulacao: bool(process.env.WORKER_SIMULACAO, true),
  headless: bool(process.env.WORKER_HEADLESS, true),

  intervaloMs: num(process.env.WORKER_INTERVALO_MS, 3000),
  timeoutJobMs: num(process.env.WORKER_TIMEOUT_JOB_MS, 10 * 60 * 1000),
  heartbeatIntervaloMs: num(process.env.WORKER_HEARTBEAT_INTERVALO_MS, 15000),
  heartbeatExpiraS: num(process.env.WORKER_HEARTBEAT_EXPIRA_S, 120),
  backoffBaseS: num(process.env.WORKER_BACKOFF_BASE_S, 30),

  db: {
    host: process.env.DB_HOST || 'localhost',
    porta: num(process.env.DB_PORTA, 3306),
    nome: process.env.DB_NOME || 'tr_api',
    usuario: process.env.DB_USUARIO || 'tr_api',
    senha: process.env.DB_SENHA || 'tr_api_dev',
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined,
    regiao: process.env.S3_REGIAO || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'tr-api-processos',
    accessKey: process.env.S3_ACCESS_KEY || undefined,
    secretKey: process.env.S3_SECRET_KEY || undefined,
    forcarPathStyle: bool(process.env.S3_FORCAR_PATH_STYLE, true),
  },
};
