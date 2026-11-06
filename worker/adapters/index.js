'use strict';

/**
 * Registro de adapters. Cada tribunal aponta no mapa (shared/tribunais) qual
 * adapter usa, em orgao.worker.adapter. Ex.: todos os TRTs -> 'pje-jt'.
 *
 * Contrato de um adapter:
 *   {
 *     nome: string,
 *     baixar(ctx): Promise<{ arquivos: Arquivo[], metadados?: object }>
 *   }
 *   ctx = { job, identificacao, diretorio, log, sinal }
 *   Arquivo = { caminho, nomeArquivo, contentType, tipo: 'integra'|'documento'|'outro' }
 *
 * O adapter só precisa deixar os arquivos em `diretorio`. Upload no S3, registro
 * no banco e vínculo com o usuário são feitos pelo processamento.service.
 */

const config = require('../config');
const { NaoImplementadoError } = require('../utils/erros');

const ADAPTERS = {
  simulacao: require('./simulacao'),
  'pje-jt': require('./pje-jt'),
};

function resolverAdapter(identificacao) {
  if (config.simulacao) return ADAPTERS.simulacao;

  const orgao = identificacao.orgao;
  const nome = orgao && orgao.worker && orgao.worker.adapter;
  const adapter = nome && ADAPTERS[nome];
  if (!adapter) {
    throw new NaoImplementadoError(`Nenhum adapter de download para ${orgao ? orgao.sigla : 'este tribunal'}.`);
  }
  return adapter;
}

module.exports = { resolverAdapter, ADAPTERS };
