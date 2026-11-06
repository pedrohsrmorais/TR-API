'use strict';

const processosService = require('../services/processos.service');

/** POST /api/processos/consultar { numero } -> identificação + overview do DJEN */
async function consultar(req, res) {
  const { numero } = req.body || {};
  res.json(await processosService.consultar(req.usuario, numero));
}

/** POST /api/processos/:numero/download -> enfileira o download da íntegra */
async function solicitarDownload(req, res) {
  const resultado = await processosService.solicitarDownload(req.usuario, req.params.numero);
  res.status(resultado.criado ? 202 : 200).json(resultado);
}

/** GET /api/processos -> "Meus processos" */
async function listarMeus(req, res) {
  res.json({ itens: await processosService.listarMeus(req.usuario) });
}

/** GET /api/processos/:numero -> detalhe + documentos */
async function detalhar(req, res) {
  res.json(await processosService.detalhar(req.usuario, req.params.numero));
}

module.exports = { consultar, solicitarDownload, listarMeus, detalhar };
