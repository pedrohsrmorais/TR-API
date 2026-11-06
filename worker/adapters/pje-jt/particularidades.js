'use strict';

/**
 * Ajustes por regional, quando um TRT foge do padrão PJe-JT.
 * Ex.: { TRT2: { timeoutMs: 60000 } }
 * Vazio por enquanto: todos seguem o padrão.
 */
const PARTICULARIDADES = {};

function particularidadesDe(sigla) {
  return PARTICULARIDADES[sigla] || {};
}

module.exports = { particularidadesDe, PARTICULARIDADES };
