'use strict';

/**
 * Processa UM job: escolhe o adapter, roda o robô, envia os arquivos ao S3,
 * registra no banco e vincula ao usuário. Em caso de erro, delega à fila
 * a decisão de tentar de novo ou encerrar.
 */

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');
const { ErroTemporario } = require('../utils/erros');
const tribunais = require('../../shared/tribunais');
const { resolverAdapter } = require('../adapters');
const fila = require('./fila.service');
const armazenamento = require('./armazenamento.service');

function comTimeout(promessa, ms, controlador) {
  let timer;
  const limite = new Promise((_, rejeitar) => {
    timer = setTimeout(() => {
      controlador.abort();
      rejeitar(new ErroTemporario(`Tempo limite do job esgotado (${Math.round(ms / 1000)} s).`));
    }, ms);
  });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

async function processar(job) {
  const log = logger.filho(`[job ${job.id} ${job.numero_formatado}]`);
  const identificacao = tribunais.identificar(job.numero_cnj);
  const diretorio = await fs.mkdtemp(path.join(os.tmpdir(), `tr-api-job-${job.id}-`));
  const controlador = new AbortController();
  let adapter = null;

  const pulso = setInterval(() => {
    fila.heartbeat(job.id, config.workerId).catch((err) => log.warn(`heartbeat falhou: ${err.message}`));
  }, config.heartbeatIntervaloMs);

  const inicio = Date.now();
  try {
    adapter = resolverAdapter(identificacao);
    log.info(`iniciando (adapter: ${adapter.nome}, tentativa ${job.tentativas}/${job.max_tentativas})`);

    const resultado = await comTimeout(
      adapter.baixar({ job, identificacao, diretorio, log, sinal: controlador.signal }),
      config.timeoutJobMs,
      controlador
    );

    if (!resultado || !Array.isArray(resultado.arquivos) || resultado.arquivos.length === 0) {
      throw new ErroTemporario('O robô terminou sem gerar nenhum arquivo.');
    }

    const documentos = [];
    for (const arquivo of resultado.arquivos) {
      const chave = armazenamento.montarChave({
        segmento: identificacao.numero.segmento,
        sigla: identificacao.orgao && identificacao.orgao.sigla,
        numero: identificacao.numero.digitos,
        jobId: job.id,
        nomeArquivo: arquivo.nomeArquivo,
      });
      const enviado = await armazenamento.enviarArquivo({ caminho: arquivo.caminho, chave, contentType: arquivo.contentType });
      documentos.push({ ...enviado, nomeArquivo: arquivo.nomeArquivo, contentType: arquivo.contentType, tipo: arquivo.tipo });
    }

    await fila.concluir(job, {
      adapter: adapter.nome,
      documentos,
      metadados: { ...(resultado.metadados || {}), duracaoMs: Date.now() - inicio, workerId: config.workerId },
    });
    log.info(`concluído: ${documentos.length} arquivo(s) em ${Math.round((Date.now() - inicio) / 1000)} s`);
  } catch (err) {
    const metadados = { workerId: config.workerId, duracaoMs: Date.now() - inicio, tipoErro: err.name };

    if (err.capturaTela) {
      try {
        const chave = `debug/${job.id}/tentativa-${job.tentativas}-erro.png`;
        await armazenamento.enviarArquivo({ caminho: err.capturaTela, chave, contentType: 'image/png' });
        metadados.capturaTela = chave;
      } catch (e) {
        log.warn(`não foi possível enviar o print do erro: ${e.message}`);
      }
    }

    const { definitivo, atrasoS } = await fila.falhar(job, err, { adapter: adapter && adapter.nome, metadados });
    if (definitivo) log.error(`falhou definitivamente: ${err.message}`);
    else log.warn(`falhou, nova tentativa em ${atrasoS} s: ${err.message}`);
    if (!err.name || err.name === 'Error' || err.name === 'TypeError') log.debug('stack', err.stack);
  } finally {
    clearInterval(pulso);
    await fs.rm(diretorio, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { processar };
