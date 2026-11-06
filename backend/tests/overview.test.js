'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { montarOverview } = require('../services/overview.service');
const fixture = require('../fixtures/djen/00406612620258160001.json');

test('monta overview a partir da resposta do DJEN', () => {
  const o = montarOverview(fixture.items);

  assert.equal(o.encontrado, true);
  assert.equal(o.totalComunicacoes, 8);
  assert.equal(o.tribunalDjen, 'TJPR');
  assert.equal(o.orgao, '16ª Vara Cível de Curitiba');

  // classe normalizada e histórico (monitória virou execução)
  assert.equal(o.classe.atual, 'EXECUÇÃO DE TÍTULO JUDICIAL');
  assert.deepEqual(o.classe.historico.map((c) => c.nome), ['MONITÓRIA', 'EXECUÇÃO DE TÍTULO JUDICIAL']);

  assert.deepEqual(o.partes, [{ nome: 'BANCO DO BRASIL S/A', polo: 'ativo', poloCodigo: 'A' }]);
  assert.equal(o.advogados.length, 1);
  assert.equal(o.advogados[0].oab, '8123/PR');

  assert.deepEqual(o.periodo, { primeira: '2025-11-14', ultima: '2026-10-02' });
  assert.equal(o.comunicacoes[0].data, '2026-10-02');
  assert.match(o.comunicacoes[0].texto, /seq\. 77/);
});

test('overview vazio quando o DJEN não retorna nada', () => {
  const o = montarOverview([]);
  assert.equal(o.encontrado, false);
  assert.equal(o.totalComunicacoes, 0);
});

test('limpa HTML do texto', () => {
  const o = montarOverview([{ id: 1, data_disponibilizacao: '2026-01-01', texto: '<p>Intime-se&nbsp;a parte</p><br>Prazo: 5 dias &amp; mais' }]);
  assert.equal(o.comunicacoes[0].texto, 'Intime-se a parte\n\nPrazo: 5 dias & mais');
});
