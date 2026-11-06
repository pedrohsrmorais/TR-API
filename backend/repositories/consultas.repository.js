'use strict';

const { pool } = require('../config/database');

async function registrar({ processoId, usuarioId, sucesso, totalComunicacoes = 0, overview = null, respostaBruta = null, erro = null, duracaoMs = null }) {
  const [r] = await pool.query(
    `INSERT INTO consultas_djen
       (processo_id, usuario_id, sucesso, total_comunicacoes, overview, resposta_bruta, erro, duracao_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      processoId,
      usuarioId,
      sucesso ? 1 : 0,
      totalComunicacoes,
      overview ? JSON.stringify(overview) : null,
      respostaBruta ? JSON.stringify(respostaBruta) : null,
      erro ? String(erro).slice(0, 500) : null,
      duracaoMs,
    ]
  );
  return r.insertId;
}

/** Última consulta bem-sucedida (usada como cache quando o DJEN falha). */
async function ultimaComSucesso(processoId) {
  const [linhas] = await pool.query(
    `SELECT id, overview, total_comunicacoes, criado_em
       FROM consultas_djen
      WHERE processo_id = ? AND sucesso = 1
      ORDER BY criado_em DESC, id DESC
      LIMIT 1`,
    [processoId]
  );
  return linhas[0] || null;
}

module.exports = { registrar, ultimaComSucesso };
