'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const cnj = require('../../shared/cnj');
const tribunais = require('../../shared/tribunais');

test('valida número real (TJPR) com e sem máscara', () => {
  for (const n of ['0040661-26.2025.8.16.0001', '00406612620258160001']) {
    const r = cnj.analisar(n);
    assert.equal(r.valido, true);
    assert.equal(r.formatado, '0040661-26.2025.8.16.0001');
    assert.equal(r.segmento, '8');
    assert.equal(r.tribunal, '16');
  }
});

test('rejeita dígito verificador errado', () => {
  const r = cnj.analisar('0040661-27.2025.8.16.0001');
  assert.equal(r.valido, false);
  assert.match(r.motivo, /verificador/);
});

test('rejeita tamanho errado', () => {
  assert.equal(cnj.analisar('123').valido, false);
  assert.equal(cnj.analisar('').valido, false);
});

test('identifica TJPR, sem download (fora da Justiça do Trabalho)', () => {
  const r = tribunais.identificar('0040661-26.2025.8.16.0001');
  assert.equal(r.orgao.sigla, 'TJPR');
  assert.equal(r.segmento.codigo, '8');
  assert.equal(r.downloadHabilitado, false);
});

test('identifica os 24 TRTs e habilita download', () => {
  for (let n = 1; n <= 24; n += 1) {
    const tr = String(n).padStart(2, '0');
    const partes = { sequencial: '0000123', ano: '2024', segmento: '5', tribunal: tr, origem: '0001' };
    const dv = cnj.calcularDigitoVerificador(partes);
    const numero = `0000123${dv}20245${tr}0001`;
    const r = tribunais.identificar(numero);
    assert.equal(r.numero.valido, true, numero);
    assert.equal(r.orgao.sigla, `TRT${n}`);
    assert.equal(r.downloadHabilitado, true);
    assert.equal(r.orgao.urls.consulta_publica, `https://pje.trt${n}.jus.br/consultaprocessual/`);
  }
});

test('mapa tem 92 tribunais, 3 conselhos e 12 CJMs', () => {
  assert.deepEqual(tribunais.mapa.resumo, { tribunais: 92, conselhos: 3, circunscricoes_militares: 12 });
});
