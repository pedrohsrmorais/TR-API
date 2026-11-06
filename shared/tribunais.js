'use strict';

/**
 * Identificação de tribunal a partir do número CNJ, usando o mapa de referência
 * shared/tribunais/mapa_tribunais_cnj_brasil.json.
 */

const path = require('path');
const cnj = require('./cnj');

const mapa = require(path.join(__dirname, 'tribunais', 'mapa_tribunais_cnj_brasil.json'));

/**
 * Identifica segmento e órgão a partir do número (com ou sem máscara).
 *
 * @returns {{
 *   numero: ReturnType<typeof cnj.analisar>,
 *   segmento: object|null,
 *   orgao: object|null,
 *   downloadHabilitado: boolean
 * }}
 */
function identificar(numero) {
  const analise = cnj.analisar(numero);
  if (!analise.valido) {
    return { numero: analise, segmento: null, orgao: null, downloadHabilitado: false };
  }

  const segmentoMapa = mapa.segmentos[analise.segmento] || null;
  const orgao = segmentoMapa ? segmentoMapa.orgaos.find((o) => o.tr === analise.tribunal) || null : null;

  // devolve o segmento sem a lista de órgãos, para não inflar respostas
  const segmento = segmentoMapa
    ? { codigo: segmentoMapa.codigo, nome: segmentoMapa.nome, sigla_ramo: segmentoMapa.sigla_ramo, download_habilitado: segmentoMapa.download_habilitado }
    : null;

  return {
    numero: analise,
    segmento,
    orgao,
    downloadHabilitado: Boolean(segmentoMapa && segmentoMapa.download_habilitado && orgao && orgao.worker && orgao.worker.adapter),
  };
}

/** Lista todos os órgãos de um segmento (ex.: '5' = Justiça do Trabalho). */
function listarPorSegmento(codigoSegmento) {
  const s = mapa.segmentos[String(codigoSegmento)];
  return s ? s.orgaos : [];
}

module.exports = { mapa, identificar, listarPorSegmento };
