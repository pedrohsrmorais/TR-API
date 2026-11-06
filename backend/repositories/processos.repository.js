'use strict';

const { pool } = require('../config/database');

/**
 * Cria o processo se não existir e devolve o id.
 * @param {{ numero: object, orgao: object|null }} identificacao retorno de shared/tribunais.identificar
 */
async function garantir(identificacao, conexao = pool) {
  const n = identificacao.numero;
  const sigla = identificacao.orgao ? identificacao.orgao.sigla : null;
  const [resultado] = await conexao.query(
    `INSERT INTO processos
       (numero_cnj, numero_formatado, ano, segmento_justica, codigo_tribunal, codigo_origem, sigla_tribunal)
     VALUES (?, ?, ?, ?, ?, ?, ?) AS novo
     ON DUPLICATE KEY UPDATE
       sigla_tribunal = novo.sigla_tribunal,
       id = LAST_INSERT_ID(processos.id)`,
    [n.digitos, n.formatado, Number(n.ano), n.segmento, n.tribunal, n.origem, sigla]
  );
  return resultado.insertId;
}

async function buscarPorNumero(numeroCnj) {
  const [linhas] = await pool.query('SELECT * FROM processos WHERE numero_cnj = ? LIMIT 1', [numeroCnj]);
  return linhas[0] || null;
}

async function atualizarDadosDjen(id, { orgao, classe }) {
  await pool.query(
    `UPDATE processos
        SET orgao = COALESCE(?, orgao), classe = COALESCE(?, classe), ultima_consulta_djen_em = UTC_TIMESTAMP()
      WHERE id = ?`,
    [orgao || null, classe || null, id]
  );
}

/** "Meus processos": processos já baixados e vinculados ao usuário. */
async function listarDoUsuario(usuarioId) {
  const [linhas] = await pool.query(
    `SELECT p.id, p.numero_cnj, p.numero_formatado, p.segmento_justica, p.codigo_tribunal, p.sigla_tribunal,
            p.classe, p.orgao, p.ultima_consulta_djen_em,
            up.criado_em AS vinculado_em, up.atualizado_em AS atualizado_em,
            j.id AS ultimo_job_id, j.status AS ultimo_job_status, j.finalizado_em AS ultimo_download_em,
            (SELECT COUNT(*) FROM documentos d WHERE d.processo_id = p.id) AS total_documentos
       FROM usuarios_processos up
       JOIN processos p ON p.id = up.processo_id
       LEFT JOIN download_jobs j ON j.id = up.ultimo_download_job_id
      WHERE up.usuario_id = ?
      ORDER BY up.atualizado_em DESC`,
    [usuarioId]
  );
  return linhas;
}

async function buscarVinculo(usuarioId, processoId) {
  const [linhas] = await pool.query(
    'SELECT * FROM usuarios_processos WHERE usuario_id = ? AND processo_id = ? LIMIT 1',
    [usuarioId, processoId]
  );
  return linhas[0] || null;
}

module.exports = { garantir, buscarPorNumero, atualizarDadosDjen, listarDoUsuario, buscarVinculo };
