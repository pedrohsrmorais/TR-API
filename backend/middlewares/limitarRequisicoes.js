'use strict';

const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const resposta = (mensagem) => ({ erro: { codigo: 'MUITAS_REQUISICOES', mensagem } });

/** Login: protege contra força bruta. */
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: resposta('Muitas tentativas de login. Aguarde 15 minutos.'),
});

/** Consulta ao DJEN: evita que a aplicação seja bloqueada pelo CNJ por excesso. */
const limitarConsultaDjen = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => (req.usuario ? `u:${req.usuario.id}` : ipKeyGenerator(req.ip)),
  message: resposta('Muitas consultas em sequência. Aguarde um minuto.'),
});

module.exports = { limitarLogin, limitarConsultaDjen };
