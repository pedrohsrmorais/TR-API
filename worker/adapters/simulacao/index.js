'use strict';

/**
 * Adapter de simulação (WORKER_SIMULACAO=true).
 * Não acessa tribunal: gera um PDF marcado como SIMULADO para validar o fluxo
 * inteiro (fila -> S3 -> banco -> "Meus processos" -> download no front).
 */

const fs = require('fs/promises');
const path = require('path');
const { gerarPdfTexto } = require('../../utils/pdf');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function baixar({ job, identificacao, diretorio, log }) {
  const { numero, orgao, segmento } = identificacao;
  log.info(`[simulação] gerando PDF fictício para ${numero.formatado}`);
  await esperar(1500 + Math.floor(Math.random() * 2000)); // parece um robô trabalhando

  const pdf = gerarPdfTexto([
    { texto: 'DOCUMENTO SIMULADO - NÃO É A ÍNTEGRA REAL', tamanho: 16 },
    '',
    `Processo: ${numero.formatado}`,
    `Tribunal: ${orgao ? `${orgao.sigla} - ${orgao.nome}` : 'não identificado'}`,
    `Segmento: ${segmento ? segmento.nome : '-'}`,
    `Job de download: #${job.id} (tentativa ${job.tentativas})`,
    `Gerado em: ${new Date().toISOString()}`,
    '',
    'Este arquivo foi gerado porque o worker está com WORKER_SIMULACAO=true.',
    'Para usar os robôs reais, defina WORKER_SIMULACAO=false.',
  ]);

  const nomeArquivo = `${numero.formatado}_integra_SIMULADA.pdf`;
  const caminho = path.join(diretorio, nomeArquivo);
  await fs.writeFile(caminho, pdf);

  return {
    arquivos: [{ caminho, nomeArquivo, contentType: 'application/pdf', tipo: 'integra' }],
    metadados: { simulado: true },
  };
}

module.exports = { nome: 'simulacao', baixar };
