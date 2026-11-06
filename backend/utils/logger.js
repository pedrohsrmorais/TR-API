'use strict';

const NIVEIS = { debug: 10, info: 20, warn: 30, error: 40 };
const nivelAtual = NIVEIS[process.env.LOG_NIVEL] || NIVEIS.info;

function log(nivel, mensagem, extra) {
  if (NIVEIS[nivel] < nivelAtual) return;
  const linha = `${new Date().toISOString()} [${nivel.toUpperCase()}] ${mensagem}`;
  const saida = nivel === 'error' ? console.error : nivel === 'warn' ? console.warn : console.log;
  if (extra !== undefined) saida(linha, extra);
  else saida(linha);
}

module.exports = {
  debug: (m, e) => log('debug', m, e),
  info: (m, e) => log('info', m, e),
  warn: (m, e) => log('warn', m, e),
  error: (m, e) => log('error', m, e),
};
