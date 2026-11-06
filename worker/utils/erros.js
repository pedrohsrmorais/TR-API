'use strict';

/**
 * Erros do worker. A flag `definitivo` decide se o job é re-tentado:
 *   definitivo = true  -> vai direto para status 'erro' (não adianta tentar de novo)
 *   definitivo = false -> volta para 'pendente' com backoff, até max_tentativas
 */

class ErroWorker extends Error {
  constructor(mensagem, { definitivo = false, causa, capturaTela } = {}) {
    super(mensagem);
    this.name = this.constructor.name;
    this.definitivo = definitivo;
    if (causa) this.cause = causa;
    if (capturaTela) this.capturaTela = capturaTela; // caminho de um PNG para debug
  }
}

/** Adapter/etapa ainda não implementado. */
class NaoImplementadoError extends ErroWorker {
  constructor(mensagem, opcoes = {}) {
    super(mensagem, { ...opcoes, definitivo: true });
  }
}

/** O tribunal respondeu que o processo não existe / é sigiloso. */
class ProcessoIndisponivelError extends ErroWorker {
  constructor(mensagem, opcoes = {}) {
    super(mensagem, { ...opcoes, definitivo: true });
  }
}

/** Instabilidade do tribunal, timeout, captcha que falhou etc. Vale tentar de novo. */
class ErroTemporario extends ErroWorker {
  constructor(mensagem, opcoes = {}) {
    super(mensagem, { ...opcoes, definitivo: false });
  }
}

module.exports = { ErroWorker, NaoImplementadoError, ProcessoIndisponivelError, ErroTemporario };
