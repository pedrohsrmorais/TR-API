'use strict';

const AppError = require('../utils/AppError');
const downloadsRepo = require('../repositories/downloads.repository');
const { resumoJob } = require('../services/processos.service');

const formatar = (j) => ({ ...resumoJob(j), numero: j.numero_cnj, numeroFormatado: j.numero_formatado, siglaTribunal: j.sigla_tribunal });

/** GET /api/downloads?ativos=1 */
async function listar(req, res) {
  const apenasAtivos = ['1', 'true'].includes(String(req.query.ativos));
  const jobs = await downloadsRepo.listarDoUsuario(req.usuario.id, { apenasAtivos });
  res.json({ itens: jobs.map(formatar) });
}

/** GET /api/downloads/:id (o front faz polling aqui) */
async function detalhar(req, res) {
  const job = await downloadsRepo.buscarPorId(Number(req.params.id));
  if (!job || (job.usuario_id !== req.usuario.id && req.usuario.perfil !== 'admin')) {
    throw AppError.naoEncontrado('Download não encontrado.');
  }
  res.json(formatar(job));
}

module.exports = { listar, detalhar };
