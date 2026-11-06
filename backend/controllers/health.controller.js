'use strict';

const { pool } = require('../config/database');
const pacote = require('../package.json');

async function verificar(_req, res) {
  let banco = 'ok';
  try {
    await pool.query('SELECT 1');
  } catch {
    banco = 'indisponivel';
  }
  const ok = banco === 'ok';
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'degradado', versao: pacote.version, banco, horario: new Date().toISOString() });
}

module.exports = { verificar };
