/* Cliente da API + sessão. Disponível como window.API */
(function () {
  'use strict';

  const CHAVE_SESSAO = 'trapi.sessao';

  function sessao() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
    } catch {
      return null;
    }
  }

  function salvarSessao(dados) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(dados));
  }

  function sair() {
    localStorage.removeItem(CHAVE_SESSAO);
    window.location.href = '/';
  }

  function cabecalhos(extra) {
    const s = sessao();
    return Object.assign({}, s && s.token ? { Authorization: 'Bearer ' + s.token } : {}, extra || {});
  }

  async function requisitar(metodo, caminho, corpo) {
    const resposta = await fetch('/api' + caminho, {
      method: metodo,
      headers: cabecalhos(corpo ? { 'Content-Type': 'application/json' } : null),
      body: corpo ? JSON.stringify(corpo) : undefined,
    });

    if (resposta.status === 401 && sessao() && caminho !== '/auth/login') {
      sair();
      throw new Error('Sessão expirada.');
    }

    const dados = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      const erro = new Error((dados && dados.erro && dados.erro.mensagem) || 'Erro HTTP ' + resposta.status);
      erro.status = resposta.status;
      erro.codigo = dados && dados.erro && dados.erro.codigo;
      throw erro;
    }
    return dados;
  }

  /** Baixa um arquivo autenticado (não dá para usar <a href> direto por causa do token). */
  async function baixarArquivo(caminho, nomeSugerido) {
    const resposta = await fetch('/api' + caminho, { headers: cabecalhos() });
    if (resposta.status === 401) return sair();
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      throw new Error((dados && dados.erro && dados.erro.mensagem) || 'Falha no download (HTTP ' + resposta.status + ')');
    }
    const blob = await resposta.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeSugerido || 'documento';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  window.API = {
    sessao,
    salvarSessao,
    sair,
    get: (c) => requisitar('GET', c),
    post: (c, corpo) => requisitar('POST', c, corpo || {}),
    baixarArquivo,
  };
})();
