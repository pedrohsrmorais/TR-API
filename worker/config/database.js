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
  connectionLimit: 5,
  waitForConnections: true,
  timezone: 'Z',
  charset: 'utf8mb4',
});

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function transacao(fn) {
  const conexao = await pool.getConnection();
  try {
    await conexao.beginTransaction();
    const r = await fn(conexao);
    await conexao.commit();
    return r;
  } catch (err) {
    await conexao.rollback();
    throw err;
  } finally {
    conexao.release();
  }
}

module.exports = { pool, aguardarBanco, transacao, esperar };
