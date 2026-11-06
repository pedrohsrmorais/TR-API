'use strict';

const { pool } = require('../config/database');

async function listarPorProcesso(processoId) {
  const [linhas] = await pool.query(
    `SELECT id, processo_id, download_job_id, tipo, nome_arquivo, content_type, tamanho_bytes, sha256, criado_em
       FROM documentos
      WHERE processo_id = ?
      ORDER BY criado_em DESC, id DESC`,
    [processoId]
  );
  return linhas;
}

async function buscarPorId(id) {
  const [linhas] = await pool.query('SELECT * FROM documentos WHERE id = ? LIMIT 1', [id]);
  return linhas[0] || null;
}

module.exports = { listarPorProcesso, buscarPorId };
