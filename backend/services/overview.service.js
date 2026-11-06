'use strict';

/**
 * Transforma os itens crus do DJEN no "overview" que o advogado vê antes de decidir baixar.
 * Função pura (sem I/O) para ser fácil de testar.
 */

const { htmlParaTexto, normalizarCaixaAlta } = require('../utils/texto');

const POLOS = { A: 'ativo', P: 'passivo', T: 'terceiro' };

const ordenarMaisRecentePrimeiro = (a, b) =>
  String(b.data_disponibilizacao).localeCompare(String(a.data_disponibilizacao)) || (Number(b.id) || 0) - (Number(a.id) || 0);

/**
 * @param {object[]} itens itens de /api/v1/comunicacao
 * @returns {object} overview
 */
function montarOverview(itens) {
  const lista = [...(itens || [])].filter((i) => i && i.ativo !== false).sort(ordenarMaisRecentePrimeiro);

  if (lista.length === 0) {
    return {
      encontrado: false,
      tribunalDjen: null,
      orgao: null,
      classe: { atual: null, codigo: null, historico: [] },
      partes: [],
      advogados: [],
      meios: [],
      totalComunicacoes: 0,
      periodo: { primeira: null, ultima: null },
      comunicacoes: [],
    };
  }

  const maisRecente = lista[0];

  // histórico de classes (ex.: MONITÓRIA -> EXECUÇÃO DE TÍTULO JUDICIAL)
  const classes = new Map();
  for (const item of [...lista].reverse()) {
    const nome = normalizarCaixaAlta(item.nomeClasse);
    if (!nome) continue;
    const atual = classes.get(nome);
    if (!atual) classes.set(nome, { nome, codigo: item.codigoClasse || null, primeiraData: item.data_disponibilizacao, ultimaData: item.data_disponibilizacao });
    else atual.ultimaData = item.data_disponibilizacao;
  }

  const partes = new Map();
  const advogados = new Map();
  const meios = new Set();

  for (const item of lista) {
    if (item.meiocompleto) meios.add(item.meiocompleto);

    for (const d of item.destinatarios || []) {
      const nome = (d.nome || '').trim();
      if (!nome) continue;
      const chave = `${nome}|${d.polo || ''}`;
      if (!partes.has(chave)) partes.set(chave, { nome, polo: POLOS[d.polo] || 'nao_informado', poloCodigo: d.polo || null });
    }

    for (const da of item.destinatarioadvogados || []) {
      const adv = da.advogado || {};
      const chave = adv.id || `${adv.numero_oab}/${adv.uf_oab}`;
      if (!chave || advogados.has(chave)) continue;
      advogados.set(chave, {
        nome: adv.nome || null,
        numeroOab: adv.numero_oab || null,
        ufOab: adv.uf_oab || null,
        oab: adv.numero_oab ? `${adv.numero_oab}/${adv.uf_oab || '??'}` : null,
      });
    }
  }

  const comunicacoes = lista.map((item) => ({
    id: item.id,
    data: item.data_disponibilizacao,
    tipo: item.tipoComunicacao || null,
    tipoDocumento: item.tipoDocumento || null,
    orgao: item.nomeOrgao || null,
    classe: normalizarCaixaAlta(item.nomeClasse),
    texto: htmlParaTexto(item.texto),
    link: item.link || null,
    meio: item.meiocompleto || item.meio || null,
    numeroComunicacao: item.numeroComunicacao ?? null,
    destinatarios: (item.destinatarios || []).map((d) => ({ nome: d.nome, polo: POLOS[d.polo] || 'nao_informado' })),
  }));

  return {
    encontrado: true,
    tribunalDjen: maisRecente.siglaTribunal || null,
    orgao: maisRecente.nomeOrgao || null,
    classe: {
      atual: normalizarCaixaAlta(maisRecente.nomeClasse),
      codigo: maisRecente.codigoClasse || null,
      historico: [...classes.values()],
    },
    partes: [...partes.values()],
    advogados: [...advogados.values()],
    meios: [...meios],
    totalComunicacoes: lista.length,
    periodo: { primeira: lista[lista.length - 1].data_disponibilizacao, ultima: maisRecente.data_disponibilizacao },
    comunicacoes,
  };
}

module.exports = { montarOverview };
