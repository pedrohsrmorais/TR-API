'use strict';

/**
 * Adapter PJe da Justiça do Trabalho: atende os 24 TRTs.
 * Todos usam o PJe-JT com o mesmo front (pje.trtN.jus.br), então um adapter
 * parametrizado pela URL do tribunal (vinda do mapa) cobre todos.
 * Diferenças pontuais entre regionais ficam em `particularidades.js`.
 *
 * STATUS: esqueleto. As etapas de pesquisa e download serão implementadas a
 * partir dos prints/HTML das telas (ver docs/worker.md).
 */

const path = require('path');
const { chromium } = require('playwright');
const config = require('../../config');
const etapas = require('./etapas');
const { particularidadesDe } = require('./particularidades');

async function baixar(ctx) {
  const { identificacao, diretorio, log, sinal } = ctx;
  const { orgao } = identificacao;
  const extras = particularidadesDe(orgao.sigla);

  const navegador = await chromium.launch({ headless: config.headless });
  const aoAbortar = () => navegador.close().catch(() => {});
  if (sinal) sinal.addEventListener('abort', aoAbortar, { once: true });

  let pagina;
  try {
    const contexto = await navegador.newContext({
      acceptDownloads: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      viewport: { width: 1366, height: 900 },
    });
    contexto.setDefaultTimeout(extras.timeoutMs || 30000);
    pagina = await contexto.newPage();

    await etapas.abrirConsultaPublica(pagina, orgao, log);
    await etapas.pesquisarProcesso(pagina, identificacao, log);
    const arquivos = await etapas.baixarIntegra(pagina, identificacao, diretorio, log);

    return { arquivos, metadados: { tribunal: orgao.sigla, urlConsulta: orgao.urls.consulta_publica } };
  } catch (err) {
    // tira um print da tela onde falhou: vai para o S3 (debug/) e ajuda a ajustar seletores
    if (pagina && !pagina.isClosed()) {
      const captura = path.join(diretorio, 'erro.png');
      await pagina.screenshot({ path: captura, fullPage: true }).then(() => { err.capturaTela = captura; }).catch(() => {});
    }
    throw err;
  } finally {
    if (sinal) sinal.removeEventListener('abort', aoAbortar);
    await navegador.close().catch(() => {});
  }
}

module.exports = { nome: 'pje-jt', baixar };
