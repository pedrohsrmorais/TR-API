'use strict';

const documentosService = require('../services/documentos.service');

/** GET /api/documentos/:id/download -> stream do arquivo */
async function baixar(req, res) {
  const { documento, corpo, tamanho } = await documentosService.abrir(req.usuario, Number(req.params.id));

  const nome = documento.nome_arquivo;
  const nomeAscii = nome.normalize('NFD').replace(/[^\x20-\x7e]/g, '').replace(/"/g, '');
  res.setHeader('Content-Type', documento.content_type || 'application/octet-stream');
  if (tamanho) res.setHeader('Content-Length', String(tamanho));
  res.setHeader('Content-Disposition', `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(nome)}`);
  res.setHeader('Cache-Control', 'private, no-store');

  corpo.on('error', (err) => res.destroy(err));
  corpo.pipe(res);
}

module.exports = { baixar };
