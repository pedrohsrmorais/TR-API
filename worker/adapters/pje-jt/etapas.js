'use strict';

/**
 * Etapas do robô no PJe-JT. Cada etapa recebe a página do Playwright.
 * Seletores ficam em seletores.js para ajustar sem mexer na lógica.
 */

const { NaoImplementadoError, ErroTemporario } = require('../../utils/erros');
const SELETORES = require('./seletores');

/** 1. Abre a consulta pública do tribunal. */
async function abrirConsultaPublica(pagina, orgao, log) {
  const url = orgao.urls && orgao.urls.consulta_publica;
  if (!url) throw new NaoImplementadoError(`${orgao.sigla} não tem URL de consulta pública no mapa de tribunais.`);

  log.info(`abrindo ${url}`);
  const resposta = await pagina.goto(url, { waitUntil: 'domcontentloaded' }).catch((err) => {
    throw new ErroTemporario(`Não foi possível abrir ${url}: ${err.message}`, { causa: err });
  });
  if (resposta && resposta.status() >= 500) {
    throw new ErroTemporario(`${orgao.sigla} respondeu HTTP ${resposta.status()} na consulta pública.`);
  }
}

/** 2. Pesquisa o processo pelo número. */
// eslint-disable-next-line no-unused-vars
async function pesquisarProcesso(pagina, identificacao, log) {
  // TODO: implementar com base nos prints/HTML da tela de consulta.
  // Esperado: preencher SELETORES.campoNumeroProcesso, tratar o captcha/desafio
  // (se houver), clicar em pesquisar e abrir os autos.
  void SELETORES;
  throw new NaoImplementadoError(
    `Robô do ${identificacao.orgao.sigla} ainda não implementado: falta mapear a tela de pesquisa do PJe-JT.`
  );
}

/**
 * 3. Baixa a íntegra (PDF dos autos).
 * @returns {Promise<Array<{ caminho, nomeArquivo, contentType, tipo }>>}
 */
// eslint-disable-next-line no-unused-vars
async function baixarIntegra(pagina, identificacao, diretorio, log) {
  // TODO: implementar. Padrão sugerido com Playwright:
  //   const [download] = await Promise.all([
  //     pagina.waitForEvent('download'),
  //     pagina.click(SELETORES.botaoDownloadIntegra),
  //   ]);
  //   const nomeArquivo = `${identificacao.numero.formatado}_integra.pdf`;
  //   const caminho = path.join(diretorio, nomeArquivo);
  //   await download.saveAs(caminho);
  //   return [{ caminho, nomeArquivo, contentType: 'application/pdf', tipo: 'integra' }];
  throw new NaoImplementadoError('Download da íntegra no PJe-JT ainda não implementado.');
}

module.exports = { abrirConsultaPublica, pesquisarProcesso, baixarIntegra };
