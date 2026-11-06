'use strict';

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Remove HTML e decodifica entidades básicas: os textos do DJEN às vezes vêm em HTML. */
function htmlParaTexto(html) {
  if (!html) return '';
  return String(html)
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const cod = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(cod) ? String.fromCodePoint(cod) : m;
      }
      return ENTIDADES[e.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * O DJEN devolve alguns campos com caixa quebrada (ex.: "EXECUçãO DE TíTULO JUDICIAL").
 * Normaliza para caixa alta em pt-BR.
 */
function normalizarCaixaAlta(valor) {
  if (!valor) return valor ?? null;
  return String(valor).toLocaleUpperCase('pt-BR').replace(/\s+/g, ' ').trim();
}

module.exports = { htmlParaTexto, normalizarCaixaAlta };
