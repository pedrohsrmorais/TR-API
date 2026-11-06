'use strict';

/**
 * Cliente da API pública do DJEN (Comunica PJe / CNJ).
 * Endpoint: GET {DJEN_BASE_URL}/api/v1/comunicacao?numeroProcesso=<20 dígitos>
 *
 * Importante: o DJEN traz PUBLICAÇÕES (intimações, editais...), não o histórico
 * completo de movimentações. Serve como overview rápido antes do download.
 */

const fs = require('fs/promises');
const path = require('path');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const DIRETORIO_FIXTURES = path.join(__dirname, '..', 'fixtures', 'djen');

async function buscarPagina(numeroProcesso, pagina) {
  const url = new URL('/api/v1/comunicacao', config.djen.baseUrl);
  url.searchParams.set('numeroProcesso', numeroProcesso);
  url.searchParams.set('pagina', String(pagina));
  url.searchParams.set('itensPorPagina', String(config.djen.itensPorPagina));

  let resposta;
  try {
    resposta = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'TR-API/0.1 (+consulta DJEN)' },
      signal: AbortSignal.timeout(config.djen.timeoutMs),
    });
  } catch (err) {
    const motivo = err.name === 'TimeoutError' ? `tempo esgotado (${config.djen.timeoutMs} ms)` : err.message;
    throw AppError.servicoExterno(`Não foi possível consultar o DJEN: ${motivo}.`);
  }

  if (resposta.status === 429) {
    throw AppError.servicoExterno('O DJEN limitou as requisições (HTTP 429). Aguarde alguns instantes e tente de novo.');
  }
  if (!resposta.ok) {
    throw AppError.servicoExterno(`O DJEN respondeu com HTTP ${resposta.status}.`);
  }

  let corpo;
  try {
    corpo = await resposta.json();
  } catch {
    throw AppError.servicoExterno('O DJEN retornou uma resposta que não é JSON.');
  }
  if (corpo.status && corpo.status !== 'success') {
    throw AppError.servicoExterno(`O DJEN retornou status "${corpo.status}": ${corpo.message || 'sem mensagem'}.`);
  }
  return corpo;
}

async function buscarMock(numeroProcesso) {
  const arquivo = path.join(DIRETORIO_FIXTURES, `${numeroProcesso}.json`);
  try {
    return JSON.parse(await fs.readFile(arquivo, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return { status: 'success', message: 'Sucesso (mock)', count: 0, items: [] };
    throw err;
  }
}

/**
 * Busca todas as comunicações de um processo (paginando).
 * @param {string} numeroProcesso 20 dígitos, sem máscara
 * @returns {Promise<{ itens: object[], total: number, paginas: number, origem: 'api'|'mock', duracaoMs: number }>}
 */
async function consultarPorProcesso(numeroProcesso) {
  const inicio = Date.now();

  if (config.djen.mock) {
    const corpo = await buscarMock(numeroProcesso);
    const itens = corpo.items || [];
    return { itens, total: itens.length, paginas: 1, origem: 'mock', duracaoMs: Date.now() - inicio };
  }

  const itens = [];
  let total = 0;
  let pagina = 1;

  while (pagina <= config.djen.maxPaginas) {
    const corpo = await buscarPagina(numeroProcesso, pagina);
    const lote = Array.isArray(corpo.items) ? corpo.items : [];
    total = Number(corpo.count) || itens.length + lote.length;
    itens.push(...lote);

    if (lote.length < config.djen.itensPorPagina || itens.length >= total) break;
    pagina += 1;
  }

  if (itens.length < total) {
    logger.warn(`DJEN: ${numeroProcesso} tem ${total} comunicações, carregadas ${itens.length} (limite DJEN_MAX_PAGINAS=${config.djen.maxPaginas}).`);
  }

  return { itens, total, paginas: pagina, origem: 'api', duracaoMs: Date.now() - inicio };
}

module.exports = { consultarPorProcesso };
