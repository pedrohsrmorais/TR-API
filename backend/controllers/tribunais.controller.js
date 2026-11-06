'use strict';

const tribunais = require('../../shared/tribunais');
const AppError = require('../utils/AppError');
const { avaliarDownload } = require('../services/processos.service');

/** GET /api/tribunais/identificar/:numero (só identifica, não consulta nada externo) */
async function identificar(req, res) {
  const id = tribunais.identificar(req.params.numero);
  if (!id.numero.valido) throw AppError.requisicaoInvalida(id.numero.motivo, { numero: id.numero.digitos });
  res.json({ numero: id.numero, segmento: id.segmento, orgao: id.orgao, download: avaliarDownload(id) });
}

/** GET /api/tribunais?segmento=5 */
async function listar(req, res) {
  const { segmento } = req.query;
  if (segmento) {
    const s = tribunais.mapa.segmentos[segmento];
    if (!s) throw AppError.naoEncontrado(`Segmento ${segmento} não existe.`);
    return res.json(s);
  }
  return res.json(tribunais.mapa);
}

module.exports = { identificar, listar };
