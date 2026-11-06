'use strict';

/**
 * Regras de negócio do fluxo principal:
 *   1. consultar(): identifica o tribunal + overview do DJEN (rápido, sem baixar nada)
 *   2. solicitarDownload(): enfileira o download da íntegra para o worker
 *   3. listarMeus() / detalhar(): o que já foi baixado ("Meus processos")
 */

const tribunais = require('../../shared/tribunais');
const config = require('../config');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { transacao } = require('../config/database');
const djen = require('./djen.service');
const { montarOverview } = require('./overview.service');
const processosRepo = require('../repositories/processos.repository');
const consultasRepo = require('../repositories/consultas.repository');
const downloadsRepo = require('../repositories/downloads.repository');
const documentosRepo = require('../repositories/documentos.repository');

/** Identifica o número e lança 400 se for inválido. */
function identificarOuFalhar(numero) {
  const id = tribunais.identificar(numero);
  if (!id.numero.valido) throw AppError.requisicaoInvalida(id.numero.motivo, { numero: id.numero.digitos });
  return id;
}

/** Diz se o download da íntegra está liberado para esse processo, e por quê. */
function avaliarDownload(identificacao) {
  const { segmento, orgao } = identificacao;
  if (!segmento) return { habilitado: false, motivo: 'Segmento de justiça não reconhecido.' };
  if (!orgao) return { habilitado: false, motivo: `Tribunal ${identificacao.numero.tribunal} não encontrado no mapa do segmento ${segmento.nome}.` };
  if (!config.download.segmentosHabilitados.includes(segmento.codigo)) {
    return { habilitado: false, motivo: `Download ainda não disponível para ${segmento.nome}. Por enquanto, só Justiça do Trabalho.` };
  }
  if (!identificacao.downloadHabilitado) {
    return { habilitado: false, motivo: `Download ainda não disponível para ${orgao.sigla}.` };
  }
  return { habilitado: true, motivo: null };
}

function resumoTribunal(identificacao) {
  const { segmento, orgao } = identificacao;
  return {
    segmento,
    orgao: orgao
      ? { tr: orgao.tr, sigla: orgao.sigla, nome: orgao.nome, tipo: orgao.tipo, instancia: orgao.instancia, ufs: orgao.ufs, abrangencia: orgao.abrangencia, sede: orgao.sede, sistemas: orgao.sistemas || [], urls: orgao.urls || {} }
      : null,
  };
}

function resumoJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    status: job.status,
    tentativas: job.tentativas,
    maxTentativas: job.max_tentativas,
    erro: job.erro_mensagem,
    criadoEm: job.criado_em,
    iniciadoEm: job.iniciado_em,
    finalizadoEm: job.finalizado_em,
    proximaTentativaEm: job.proxima_tentativa_em,
  };
}

async function consultar(usuario, numero) {
  const identificacao = identificarOuFalhar(numero);
  const processoId = await processosRepo.garantir(identificacao);
  const digitos = identificacao.numero.digitos;

  let overview;
  let djenInfo;

  try {
    const r = await djen.consultarPorProcesso(digitos);
    overview = montarOverview(r.itens);
    await consultasRepo.registrar({
      processoId,
      usuarioId: usuario.id,
      sucesso: true,
      totalComunicacoes: overview.totalComunicacoes,
      overview,
      respostaBruta: r.itens,
      duracaoMs: r.duracaoMs,
    });
    await processosRepo.atualizarDadosDjen(processoId, { orgao: overview.orgao, classe: overview.classe.atual });
    djenInfo = { origem: r.origem, consultadoEm: new Date().toISOString(), aviso: null };
  } catch (err) {
    if (!(err instanceof AppError)) throw err;

    await consultasRepo.registrar({ processoId, usuarioId: usuario.id, sucesso: false, erro: err.message });
    const cache = await consultasRepo.ultimaComSucesso(processoId);
    if (!cache) throw err;

    logger.warn(`DJEN falhou para ${digitos}; usando cache de ${cache.criado_em}: ${err.message}`);
    overview = cache.overview;
    djenInfo = { origem: 'cache', consultadoEm: cache.criado_em, aviso: `${err.message} Exibindo a última consulta salva.` };
  }

  const [ultimoJob, vinculo] = await Promise.all([
    downloadsRepo.ultimoDoUsuario(usuario.id, processoId),
    processosRepo.buscarVinculo(usuario.id, processoId),
  ]);

  return {
    processo: { id: processoId, numero: digitos, numeroFormatado: identificacao.numero.formatado, ano: identificacao.numero.ano },
    tribunal: resumoTribunal(identificacao),
    download: { ...avaliarDownload(identificacao), noMeusProcessos: Boolean(vinculo), ultimoJob: resumoJob(ultimoJob) },
    djen: djenInfo,
    overview,
  };
}

async function solicitarDownload(usuario, numero) {
  const identificacao = identificarOuFalhar(numero);
  const avaliacao = avaliarDownload(identificacao);
  if (!avaliacao.habilitado) throw AppError.naoProcessavel('DOWNLOAD_INDISPONIVEL', avaliacao.motivo);

  const { jobId, criado } = await transacao(async (conexao) => {
    const processoId = await processosRepo.garantir(identificacao, conexao);
    const ativo = await downloadsRepo.buscarAtivoParaAtualizar(conexao, usuario.id, processoId);
    if (ativo) return { jobId: ativo.id, criado: false };
    return { jobId: await downloadsRepo.criar(conexao, { usuarioId: usuario.id, processoId }), criado: true };
  });

  const job = await downloadsRepo.buscarPorId(jobId);
  return { criado, job: { ...resumoJob(job), numeroFormatado: job.numero_formatado, siglaTribunal: job.sigla_tribunal } };
}

async function listarMeus(usuario) {
  const linhas = await processosRepo.listarDoUsuario(usuario.id);
  return linhas.map((l) => ({
    id: l.id,
    numero: l.numero_cnj,
    numeroFormatado: l.numero_formatado,
    siglaTribunal: l.sigla_tribunal,
    segmento: l.segmento_justica,
    classe: l.classe,
    orgao: l.orgao,
    totalDocumentos: Number(l.total_documentos) || 0,
    vinculadoEm: l.vinculado_em,
    ultimoDownloadEm: l.ultimo_download_em,
    ultimoJob: l.ultimo_job_id ? { id: l.ultimo_job_id, status: l.ultimo_job_status } : null,
  }));
}

async function detalhar(usuario, numero) {
  const identificacao = identificarOuFalhar(numero);
  const processo = await processosRepo.buscarPorNumero(identificacao.numero.digitos);
  if (!processo) throw AppError.naoEncontrado('Processo ainda não consultado nesta aplicação.');

  const vinculo = await processosRepo.buscarVinculo(usuario.id, processo.id);
  if (!vinculo && usuario.perfil !== 'admin') throw AppError.naoEncontrado('Este processo não está em "Meus processos".');

  const [documentos, cache, ultimoJob] = await Promise.all([
    documentosRepo.listarPorProcesso(processo.id),
    consultasRepo.ultimaComSucesso(processo.id),
    downloadsRepo.ultimoDoUsuario(usuario.id, processo.id),
  ]);

  return {
    processo: {
      id: processo.id,
      numero: processo.numero_cnj,
      numeroFormatado: processo.numero_formatado,
      classe: processo.classe,
      orgao: processo.orgao,
      ultimaConsultaDjenEm: processo.ultima_consulta_djen_em,
    },
    tribunal: resumoTribunal(identificacao),
    ultimoJob: resumoJob(ultimoJob),
    documentos: documentos.map((d) => ({
      id: d.id,
      jobId: d.download_job_id,
      tipo: d.tipo,
      nomeArquivo: d.nome_arquivo,
      contentType: d.content_type,
      tamanhoBytes: Number(d.tamanho_bytes),
      sha256: d.sha256,
      criadoEm: d.criado_em,
    })),
    overview: cache ? cache.overview : null,
  };
}

module.exports = { consultar, solicitarDownload, listarMeus, detalhar, avaliarDownload, resumoJob };
