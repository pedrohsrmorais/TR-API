'use strict';

/**
 * Monta o app Express (sem dar listen), para poder ser usado em testes.
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rotas = require('./routes');
const { rotaNaoEncontrada, tratarErros } = require('./middlewares/erros');

function criarApp() {
  const app = express();

  app.set('trust proxy', 1); // atrás do nginx do frontend
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors()); // em produção, restrinja a origem
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(':method :url :status :response-time ms', { skip: (req) => req.originalUrl === '/api/health' }));

  app.use('/api', rotas);

  app.use(rotaNaoEncontrada);
  app.use(tratarErros);

  return app;
}

module.exports = { criarApp };
