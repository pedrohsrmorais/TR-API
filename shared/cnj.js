'use strict';

/**
 * Utilitários do número único de processo (Resolução CNJ 65/2008).
 * Formato: NNNNNNN-DD.AAAA.J.TR.OOOO (20 dígitos).
 *
 * Usado pelo backend e pelo worker. Sem dependências externas.
 */

const TAMANHO = 20;

/** Remove tudo que não for dígito. */
function limpar(numero) {
  return String(numero ?? '').replace(/\D/g, '');
}

/**
 * Calcula o dígito verificador (Módulo 97 Base 10, ISO 7064).
 * @returns {string} dois dígitos
 */
function calcularDigitoVerificador({ sequencial, ano, segmento, tribunal, origem }) {
  const base = BigInt(`${sequencial}${ano}${segmento}${tribunal}${origem}00`);
  const dv = 98n - (base % 97n);
  return String(dv).padStart(2, '0');
}

function formatar(digitos) {
  const d = limpar(digitos);
  if (d.length !== TAMANHO) return null;
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`;
}

/**
 * Decompõe e valida um número CNJ.
 * Aceita com ou sem máscara.
 *
 * @returns {{
 *   valido: boolean, motivo: string|null, digitos: string, formatado: string|null,
 *   sequencial?: string, digitoVerificador?: string, ano?: string,
 *   segmento?: string, tribunal?: string, origem?: string
 * }}
 */
function analisar(numero) {
  const digitos = limpar(numero);

  if (digitos.length !== TAMANHO) {
    return {
      valido: false,
      motivo: `O número do processo deve ter ${TAMANHO} dígitos (recebido: ${digitos.length}).`,
      digitos,
      formatado: null,
    };
  }

  const partes = {
    sequencial: digitos.slice(0, 7),
    digitoVerificador: digitos.slice(7, 9),
    ano: digitos.slice(9, 13),
    segmento: digitos.slice(13, 14),
    tribunal: digitos.slice(14, 16),
    origem: digitos.slice(16, 20),
  };

  const esperado = calcularDigitoVerificador(partes);
  const resultado = { digitos, formatado: formatar(digitos), ...partes };

  if (esperado !== partes.digitoVerificador) {
    return { ...resultado, valido: false, motivo: 'Dígito verificador inválido. Confira o número digitado.' };
  }
  if (partes.segmento === '0') {
    return { ...resultado, valido: false, motivo: 'Segmento de justiça (J) inválido.' };
  }

  return { ...resultado, valido: true, motivo: null };
}

module.exports = { TAMANHO, limpar, formatar, analisar, calcularDigitoVerificador };
