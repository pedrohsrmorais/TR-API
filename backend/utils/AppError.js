'use strict';

/**
 * Erro "esperado" da aplicação: vira resposta HTTP com status e código legíveis.
 * Qualquer outro erro vira 500 genérico no errorHandler.
 */
class AppError extends Error {
  constructor(status, codigo, mensagem, detalhes) {
    super(mensagem);
    this.name = 'AppError';
    this.status = status;
    this.codigo = codigo;
    this.detalhes = detalhes;
  }

  static requisicaoInvalida(mensagem, detalhes) {
    return new AppError(400, 'REQUISICAO_INVALIDA', mensagem, detalhes);
  }

  static naoAutenticado(mensagem = 'Autenticação necessária.') {
    return new AppError(401, 'NAO_AUTENTICADO', mensagem);
  }

  static proibido(mensagem = 'Acesso negado.') {
    return new AppError(403, 'PROIBIDO', mensagem);
  }

  static naoEncontrado(mensagem = 'Recurso não encontrado.') {
    return new AppError(404, 'NAO_ENCONTRADO', mensagem);
  }

  static naoProcessavel(codigo, mensagem, detalhes) {
    return new AppError(422, codigo, mensagem, detalhes);
  }

  static servicoExterno(mensagem, detalhes) {
    return new AppError(502, 'SERVICO_EXTERNO', mensagem, detalhes);
  }
}

module.exports = AppError;
