'use strict';

const { pool } = require('../config/database');

async function buscarPorEmail(email) {
  const [linhas] = await pool.query(
    'SELECT id, nome, email, senha_hash, perfil, ativo FROM usuarios WHERE email = ? LIMIT 1',
    [email]
  );
  return linhas[0] || null;
}

async function buscarPorId(id) {
  const [linhas] = await pool.query(
    'SELECT id, nome, email, perfil, ativo, ultimo_login_em, criado_em FROM usuarios WHERE id = ? LIMIT 1',
    [id]
  );
  return linhas[0] || null;
}

async function registrarLogin(id) {
  await pool.query('UPDATE usuarios SET ultimo_login_em = UTC_TIMESTAMP() WHERE id = ?', [id]);
}

module.exports = { buscarPorEmail, buscarPorId, registrarLogin };
