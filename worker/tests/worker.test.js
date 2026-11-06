'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const { gerarPdfTexto } = require('../utils/pdf');
const { montarChave } = require('../services/armazenamento.service');
const tribunais = require('../../shared/tribunais');

test('gera PDF válido com acentos', () => {
  const pdf = gerarPdfTexto(['Processo: 0000123-81.2024.5.09.0001', 'Ação trabalhista — teste (ok)']);
  const txt = pdf.toString('latin1');
  assert.ok(txt.startsWith('%PDF-1.4'));
  assert.ok(txt.trimEnd().endsWith('%%EOF'));
  // startxref aponta para a tabela xref
  const startxref = Number(txt.match(/startxref\n(\d+)/)[1]);
  assert.equal(txt.slice(startxref, startxref + 4), 'xref');
});

test('monta chave S3 previsível e sem caracteres perigosos', () => {
  const chave = montarChave({ segmento: '5', sigla: 'TRT9', numero: '00001238120245090001', jobId: 42, nomeArquivo: '0000123-81.2024.5.09.0001 íntegra.pdf' });
  assert.equal(chave, 'processos/5/TRT9/00001238120245090001/42/0000123-81.2024.5.09.0001_ntegra.pdf');
});

test('resolve adapters: simulação por padrão, pje-jt para TRT quando real', () => {
  const id = tribunais.identificar('0000123-81.2024.5.09.0001');

  process.env.WORKER_SIMULACAO = 'true';
  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('../adapters')];
  assert.equal(require('../adapters').resolverAdapter(id).nome, 'simulacao');

  process.env.WORKER_SIMULACAO = 'false';
  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('../adapters')];
  const { resolverAdapter } = require('../adapters');
  assert.equal(resolverAdapter(id).nome, 'pje-jt');
  assert.throws(() => resolverAdapter(tribunais.identificar('0040661-26.2025.8.16.0001')), /Nenhum adapter/);
});

test('adapter de simulação gera o arquivo da íntegra', async () => {
  const simulacao = require('../adapters/simulacao');
  const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), 'tr-api-teste-'));
  const silencioso = { info() {}, warn() {}, error() {}, debug() {} };
  const r = await simulacao.baixar({
    job: { id: 1, tentativas: 1 },
    identificacao: tribunais.identificar('0000123-81.2024.5.09.0001'),
    diretorio,
    log: silencioso,
  });
  assert.equal(r.arquivos.length, 1);
  const conteudo = await fs.readFile(r.arquivos[0].caminho);
  assert.ok(conteudo.length > 500);
  await fs.rm(diretorio, { recursive: true, force: true });
});
