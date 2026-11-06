'use strict';

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

function rotaNaoEncontrada(req, _res, next) {
  next(AppError.naoEncontrado(`Rota ${req.method} ${req.originalUrl} não existe.`));
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, _next) {
  // JSON malformado no corpo
  if (err.type === 'entity.parse.failed') {
    err = AppError.requisicaoInvalida('Corpo da requisição não é um JSON válido.');
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.warn(`${req.method} ${req.originalUrl} -> ${err.status} ${err.message}`);
    return res.status(err.status).json({ erro: { codigo: err.codigo, mensagem: err.message, detalhes: err.detalhes } });
  }

  logger.error(`${req.method} ${req.originalUrl} -> erro inesperado`, err);
  if (res.headersSent) return res.end();
  return res.status(500).json({ erro: { codigo: 'ERRO_INTERNO', mensagem: 'Erro interno. Veja os logs do backend.' } });
}

module.exports = { rotaNaoEncontrada, tratarErros };
