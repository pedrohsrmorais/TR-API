'use strict';

const { pool } = require('../config/database');

const CAMPOS = `j.id, j.processo_id, j.usuario_id, j.status, j.tentativas, j.max_tentativas, j.proxima_tentativa_em,
                j.adapter, j.iniciado_em, j.finalizado_em, j.erro_mensagem, j.criado_em, j.atualizado_em,
                p.numero_cnj, p.numero_formatado, p.sigla_tribunal`;

/** Job pendente/processando do usuário para o processo (trava a linha se existir). */
async function buscarAtivoParaAtualizar(conexao, usuarioId, processoId) {
  const [linhas] = await conexao.query(
    `SELECT id FROM download_jobs
      WHERE usuario_id = ? AND processo_id = ? AND status IN ('pendente','processando')
      ORDER BY id DESC LIMIT 1
      FOR UPDATE`,
    [usuarioId, processoId]
  );
  return linhas[0] || null;
}

async function criar(conexao, { usuarioId, processoId }) {
  const [r] = await conexao.query(
    "INSERT INTO download_jobs (usuario_id, processo_id, status) VALUES (?, ?, 'pendente')",
    [usuarioId, processoId]
  );
  return r.insertId;
}

async function buscarPorId(id) {
  const [linhas] = await pool.query(
    `SELECT ${CAMPOS} FROM download_jobs j JOIN processos p ON p.id = j.processo_id WHERE j.id = ? LIMIT 1`,
    [id]
  );
  return linhas[0] || null;
}

async function ultimoDoUsuario(usuarioId, processoId) {
  const [linhas] = await pool.query(
    `SELECT ${CAMPOS} FROM download_jobs j JOIN processos p ON p.id = j.processo_id
      WHERE j.usuario_id = ? AND j.processo_id = ?
      ORDER BY j.id DESC LIMIT 1`,
    [usuarioId, processoId]
  );
  return linhas[0] || null;
}

async function listarDoUsuario(usuarioId, { apenasAtivos = false, limite = 50 } = {}) {
  const [linhas] = await pool.query(
    `SELECT ${CAMPOS} FROM download_jobs j JOIN processos p ON p.id = j.processo_id
      WHERE j.usuario_id = ? ${apenasAtivos ? "AND j.status IN ('pendente','processando')" : ''}
      ORDER BY j.id DESC LIMIT ?`,
    [usuarioId, limite]
  );
  return linhas;
}

module.exports = { buscarAtivoParaAtualizar, criar, buscarPorId, ultimoDoUsuario, listarDoUsuario };
