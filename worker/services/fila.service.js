'use strict';

/**
 * Fila de downloads em cima da tabela download_jobs.
 * Vários workers podem rodar em paralelo: a reserva usa FOR UPDATE SKIP LOCKED,
 * então cada job é pego por um único worker.
 */

const config = require('../config');
const { pool, transacao } = require('../config/database');

/** Devolve para a fila os jobs cujo worker morreu (heartbeat expirado). */
async function liberarTravados() {
  const [r] = await pool.query(
    `UPDATE download_jobs
        SET status = IF(tentativas >= max_tentativas, 'erro', 'pendente'),
            finalizado_em = IF(tentativas >= max_tentativas, UTC_TIMESTAMP(), NULL),
            erro_mensagem = CONCAT('Worker ', COALESCE(worker_id, '?'), ' parou de responder durante o processamento.'),
            worker_id = NULL,
            proxima_tentativa_em = UTC_TIMESTAMP()
      WHERE status = 'processando'
        AND heartbeat_em < UTC_TIMESTAMP() - INTERVAL ? SECOND`,
    [config.heartbeatExpiraS]
  );
  return r.affectedRows;
}

/** Reserva o próximo job pendente para este worker. Retorna null se a fila estiver vazia. */
async function reservarProximo(workerId) {
  const jobId = await transacao(async (conexao) => {
    const [linhas] = await conexao.query(
      `SELECT id FROM download_jobs
        WHERE status = 'pendente'
          AND (proxima_tentativa_em IS NULL OR proxima_tentativa_em <= UTC_TIMESTAMP())
        ORDER BY criado_em, id
        LIMIT 1
        FOR UPDATE SKIP LOCKED`
    );
    if (!linhas[0]) return null;

    await conexao.query(
      `UPDATE download_jobs
          SET status = 'processando', worker_id = ?, tentativas = tentativas + 1,
              iniciado_em = UTC_TIMESTAMP(), heartbeat_em = UTC_TIMESTAMP(), erro_mensagem = NULL
        WHERE id = ?`,
      [workerId, linhas[0].id]
    );
    return linhas[0].id;
  });

  if (!jobId) return null;

  const [jobs] = await pool.query(
    `SELECT j.*, p.numero_cnj, p.numero_formatado, p.sigla_tribunal, p.segmento_justica, p.codigo_tribunal
       FROM download_jobs j JOIN processos p ON p.id = j.processo_id
      WHERE j.id = ?`,
    [jobId]
  );
  return jobs[0];
}

async function heartbeat(jobId, workerId) {
  await pool.query(
    "UPDATE download_jobs SET heartbeat_em = UTC_TIMESTAMP() WHERE id = ? AND worker_id = ? AND status = 'processando'",
    [jobId, workerId]
  );
}

/**
 * Finaliza com sucesso: registra documentos, vincula o processo ao usuário
 * ("Meus processos") e marca o job como concluído, tudo numa transação.
 */
async function concluir(job, { adapter, documentos, metadados }) {
  await transacao(async (conexao) => {
    for (const d of documentos) {
      await conexao.query(
        `INSERT INTO documentos
           (processo_id, download_job_id, tipo, nome_arquivo, s3_bucket, s3_chave, content_type, tamanho_bytes, sha256)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [job.processo_id, job.id, d.tipo || 'integra', d.nomeArquivo, d.bucket, d.chave, d.contentType, d.tamanhoBytes, d.sha256]
      );
    }

    await conexao.query(
      `INSERT INTO usuarios_processos (usuario_id, processo_id, ultimo_download_job_id)
       VALUES (?, ?, ?) AS novo
       ON DUPLICATE KEY UPDATE ultimo_download_job_id = novo.ultimo_download_job_id, atualizado_em = UTC_TIMESTAMP()`,
      [job.usuario_id, job.processo_id, job.id]
    );

    await conexao.query(
      `UPDATE download_jobs
          SET status = 'concluido', adapter = ?, finalizado_em = UTC_TIMESTAMP(), heartbeat_em = UTC_TIMESTAMP(),
              erro_mensagem = NULL, metadados = ?
        WHERE id = ?`,
      [adapter, metadados ? JSON.stringify(metadados) : null, job.id]
    );
  });
}

/** Registra falha: re-agenda com backoff exponencial ou encerra como 'erro'. */
async function falhar(job, erro, { adapter = null, metadados = null } = {}) {
  const tentativas = Number(job.tentativas); // já incrementado na reserva
  const esgotou = tentativas >= Number(job.max_tentativas);
  const definitivo = Boolean(erro && erro.definitivo) || esgotou;
  const mensagem = String((erro && erro.message) || erro || 'Erro desconhecido').slice(0, 2000);
  const atrasoS = config.backoffBaseS * 2 ** Math.max(0, tentativas - 1);

  await pool.query(
    `UPDATE download_jobs
        SET status = ?,
            adapter = COALESCE(?, adapter),
            erro_mensagem = ?,
            worker_id = NULL,
            proxima_tentativa_em = ${definitivo ? 'NULL' : 'UTC_TIMESTAMP() + INTERVAL ? SECOND'},
            finalizado_em = ${definitivo ? 'UTC_TIMESTAMP()' : 'NULL'},
            metadados = COALESCE(?, metadados)
      WHERE id = ?`,
    [
      definitivo ? 'erro' : 'pendente',
      adapter,
      mensagem,
      ...(definitivo ? [] : [atrasoS]),
      metadados ? JSON.stringify(metadados) : null,
      job.id,
    ]
  );

  return { definitivo, atrasoS: definitivo ? null : atrasoS };
}

module.exports = { liberarTravados, reservarProximo, heartbeat, concluir, falhar };
