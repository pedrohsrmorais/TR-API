'use strict';

const mysql = require('mysql2/promise');
const config = require('./index');
const logger = require('../utils/logger');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.porta,
  database: config.db.nome,
  user: config.db.usuario,
  password: config.db.senha,
  connectionLimit: config.db.conexoes,
  waitForConnections: true,
  timezone: 'Z', // tudo em UTC no banco
  charset: 'utf8mb4',
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: false,
});

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Aguarda o MySQL aceitar conexões (útil na subida do compose). */
async function aguardarBanco({ tentativas = 30, intervaloMs = 2000 } = {}) {
  for (let i = 1; i <= tentativas; i += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      logger.warn(`MySQL indisponível (tentativa ${i}/${tentativas}): ${err.code || err.message}`);
      if (i === tentativas) throw err;
      await esperar(intervaloMs);
    }
  }
}

/** Confere se o schema do banco é o esperado pelo código. */
async function verificarSchema() {
  try {
    const [linhas] = await pool.query('SELECT versao FROM schema_info ORDER BY aplicado_em DESC, versao DESC LIMIT 1');
    const atual = linhas[0] && linhas[0].versao;
    if (atual !== config.schemaVersaoEsperada) {
      logger.warn(
        `Schema do banco na versão ${atual || 'desconhecida'}, código espera ${config.schemaVersaoEsperada}. ` +
          'Rode `make reset` (apaga os dados) para reaplicar o database/init.sql.'
      );
      return false;
    }
    return true;
  } catch (err) {
    logger.warn(`Não foi possível verificar a versão do schema: ${err.message}`);
    return false;
  }
}

/** Executa fn(conexao) dentro de uma transação. */
async function transacao(fn) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const resultado = await fn(conexao);
    await conexao.commit();
    return resultado;
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}

module.exports = { pool, aguardarBanco, verificarSchema, transacao };
