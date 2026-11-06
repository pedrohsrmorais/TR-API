(function () {
  'use strict';

  const sessao = API.sessao();
  if (!sessao) {
    window.location.replace('/');
    return;
  }

  // ---------------------------------------------------------------- helpers
  const $ = (id) => document.getElementById(id);

  const esc = (v) =>
    String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** 'AAAA-MM-DD' -> 'DD/MM/AAAA' sem passar por fuso */
  const data = (v) => (v && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10).split('-').reverse().join('/') : '—');

  const dataHora = (v) =>
    v ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—';

  const tamanho = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

  const somenteDigitos = (v) => String(v || '').replace(/\D/g, '').slice(0, 20);

  /** Aplica a máscara NNNNNNN-DD.AAAA.J.TR.OOOO progressivamente */
  function mascarar(v) {
    const d = somenteDigitos(v);
    const cortes = [[0, 7, ''], [7, 9, '-'], [9, 13, '.'], [13, 14, '.'], [14, 16, '.'], [16, 20, '.']];
    return cortes.reduce((acc, [i, f, sep]) => (d.length > i ? acc + sep + d.slice(i, f) : acc), '');
  }

  const STATUS_JOB = {
    pendente: { rotulo: 'Na fila', classe: 'neutro' },
    processando: { rotulo: 'Baixando...', classe: 'info' },
    concluido: { rotulo: 'Concluído', classe: 'sucesso' },
    erro: { rotulo: 'Erro', classe: 'erro' },
    cancelado: { rotulo: 'Cancelado', classe: 'neutro' },
  };
  const selo = (status) => {
    const s = STATUS_JOB[status] || { rotulo: status, classe: 'neutro' };
    return `<span class="selo selo--${s.classe}">${esc(s.rotulo)}</span>`;
  };

  function mostrarErro(elemento, mensagem) {
    elemento.textContent = mensagem || '';
    elemento.hidden = !mensagem;
  }

  // ---------------------------------------------------------------- topo/abas
  $('usuario-email').textContent = sessao.usuario ? sessao.usuario.email : '';
  $('botao-sair').addEventListener('click', API.sair);

  function abrirAba() {
    const aba = (window.location.hash || '#consultar').slice(1);
    document.querySelectorAll('[data-secao]').forEach((s) => (s.hidden = s.dataset.secao !== aba));
    document.querySelectorAll('[data-aba]').forEach((a) => a.classList.toggle('aba--ativa', a.dataset.aba === aba));
    if (aba === 'meus-processos') carregarMeusProcessos();
  }
  window.addEventListener('hashchange', abrirAba);

  // ---------------------------------------------------------------- consulta
  const campoNumero = $('numero');
  const previa = $('identificacao-previa');
  let ultimaPrevia = '';

  campoNumero.addEventListener('input', async () => {
    campoNumero.value = mascarar(campoNumero.value);

    const d = somenteDigitos(campoNumero.value);
    if (d.length < 20) {
      previa.textContent = d.length ? `${d.length}/20 dígitos` : '';
      previa.className = 'dica';
      return;
    }
    if (d === ultimaPrevia) return;
    ultimaPrevia = d;
    try {
      const r = await API.get('/tribunais/identificar/' + d);
      previa.textContent = r.orgao ? `${r.orgao.sigla} · ${r.orgao.nome} · ${r.orgao.abrangencia}` : `${r.segmento ? r.segmento.nome : 'Segmento desconhecido'}`;
      previa.className = 'dica dica--ok';
    } catch (err) {
      previa.textContent = err.message;
      previa.className = 'dica dica--erro';
    }
  });

  $('form-consulta').addEventListener('submit', async (e) => {
    e.preventDefault();
    const numero = somenteDigitos(campoNumero.value);
    mostrarErro($('erro-consulta'), '');
    if (numero.length !== 20) return mostrarErro($('erro-consulta'), 'Digite os 20 dígitos do número CNJ.');

    const botao = $('botao-consultar');
    botao.disabled = true;
    botao.textContent = 'Consultando DJEN...';
    $('resultado-consulta').innerHTML = '<div class="carregando">Buscando publicações no DJEN...</div>';

    try {
      const r = await API.post('/processos/consultar', { numero });
      renderizarConsulta(r);
      history.replaceState(null, '', '#consultar');
    } catch (err) {
      $('resultado-consulta').innerHTML = '';
      mostrarErro($('erro-consulta'), err.message);
    } finally {
      botao.disabled = false;
      botao.textContent = 'Consultar';
    }
  });

  function renderizarConsulta(r) {
    const { processo, tribunal, download, djen, overview: o } = r;
    const orgao = tribunal.orgao;

    const avisoDjen = djen && djen.aviso ? `<p class="alerta alerta--aviso">${esc(djen.aviso)}</p>` : '';
    const origem = djen ? (djen.origem === 'mock' ? ' (dados de exemplo / mock)' : djen.origem === 'cache' ? ' (cache)' : '') : '';

    const partes = o && o.partes.length
      ? o.partes.map((p) => `<li><span class="polo polo--${esc(p.polo)}">${esc(p.polo.replace('_', ' '))}</span> ${esc(p.nome)}</li>`).join('')
      : '<li class="vazio">Não informado no DJEN</li>';

    const advogados = o && o.advogados.length
      ? o.advogados.map((a) => `<li>${esc(a.nome)} <span class="mudo">OAB ${esc(a.oab || '—')}</span></li>`).join('')
      : '<li class="vazio">Não informado no DJEN</li>';

    const historicoClasse = o && o.classe.historico.length > 1
      ? `<p class="mudo pequeno">Histórico: ${o.classe.historico.map((c) => esc(c.nome)).join(' → ')}</p>`
      : '';

    const comunicacoes = o && o.comunicacoes.length
      ? o.comunicacoes.map((c) => `
          <li class="linha-tempo__item">
            <div class="linha-tempo__data">${data(c.data)}</div>
            <div class="linha-tempo__corpo">
              <div class="linha-tempo__titulo">${esc(c.tipo || 'Comunicação')}${c.classe ? ` <span class="mudo">· ${esc(c.classe)}</span>` : ''}</div>
              <p>${esc(c.texto)}</p>
              <div class="mudo pequeno">${esc(c.orgao || '')}${c.meio ? ' · ' + esc(c.meio) : ''}${c.link ? ` · <a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">abrir no tribunal ↗</a>` : ''}</div>
            </div>
          </li>`).join('')
      : '<li class="vazio">Nenhuma publicação encontrada no DJEN para este número.</li>';

    $('resultado-consulta').innerHTML = `
      ${avisoDjen}
      <article class="cartao processo">
        <header class="processo__cabecalho">
          <div>
            <div class="mudo pequeno">${esc(tribunal.segmento ? tribunal.segmento.nome : '')}</div>
            <h2 class="processo__numero">${esc(processo.numeroFormatado)}</h2>
            <div>${orgao ? `<strong>${esc(orgao.sigla)}</strong> · ${esc(orgao.nome)} <span class="mudo">(${esc(orgao.abrangencia)})</span>` : '<span class="mudo">Tribunal não identificado</span>'}</div>
          </div>
          <div id="area-download" class="processo__acao"></div>
        </header>

        <div class="grade">
          <div>
            <h3>Classe</h3>
            <p>${esc((o && o.classe.atual) || '—')}</p>
            ${historicoClasse}
          </div>
          <div>
            <h3>Órgão</h3>
            <p>${esc((o && o.orgao) || '—')}</p>
          </div>
          <div>
            <h3>Publicações no DJEN</h3>
            <p>${o ? o.totalComunicacoes : 0}${o && o.periodo.primeira ? ` <span class="mudo">de ${data(o.periodo.primeira)} a ${data(o.periodo.ultima)}</span>` : ''}</p>
          </div>
        </div>

        <div class="grade grade--2">
          <div><h3>Partes intimadas</h3><ul class="lista">${partes}</ul></div>
          <div><h3>Advogados</h3><ul class="lista">${advogados}</ul></div>
        </div>

        <h3>Linha do tempo (DJEN${esc(origem)})</h3>
        <ul class="linha-tempo">${comunicacoes}</ul>
        <p class="mudo pequeno">O DJEN mostra publicações, não todas as movimentações. Para os autos completos, baixe a íntegra.</p>
      </article>`;

    renderizarAreaDownload(processo.numero, download);
  }

  // ---------------------------------------------------------------- download
  let pollingAtual = null;

  function renderizarAreaDownload(numero, download) {
    const area = $('area-download');
    if (!area) return;

    if (!download.habilitado) {
      area.innerHTML = `<button class="botao" disabled>Baixar processo</button><p class="mudo pequeno">${esc(download.motivo)}</p>`;
      return;
    }

    const job = download.ultimoJob;
    const ativo = job && (job.status === 'pendente' || job.status === 'processando');

    if (ativo) {
      area.innerHTML = `${selo(job.status)}<p class="mudo pequeno">Download #${job.id} em andamento...</p>`;
      acompanhar(numero, job.id);
      return;
    }

    let extra = '';
    if (job && job.status === 'concluido') extra = `<p class="mudo pequeno">Último download: ${dataHora(job.finalizadoEm)} · <a href="#meus-processos">ver em Meus processos</a></p>`;
    if (job && job.status === 'erro') extra = `<p class="pequeno texto-erro">Último download falhou: ${esc(job.erro)}</p>`;

    area.innerHTML = `<button id="botao-baixar" class="botao botao--primario">${job && job.status === 'concluido' ? 'Baixar novamente' : 'Baixar processo'}</button>${extra}`;
    $('botao-baixar').addEventListener('click', () => solicitarDownload(numero));
  }

  async function solicitarDownload(numero) {
    const botao = $('botao-baixar');
    if (botao) {
      botao.disabled = true;
      botao.textContent = 'Enviando...';
    }
    try {
      const r = await API.post('/processos/' + numero + '/download');
      renderizarAreaDownload(numero, { habilitado: true, ultimoJob: r.job });
    } catch (err) {
      mostrarErro($('erro-consulta'), err.message);
      if (botao) {
        botao.disabled = false;
        botao.textContent = 'Baixar processo';
      }
    }
  }

  function acompanhar(numero, jobId) {
    if (pollingAtual) clearTimeout(pollingAtual);
    const tick = async () => {
      try {
        const job = await API.get('/downloads/' + jobId);
        if (!$('area-download')) return; // usuário saiu da tela
        if (job.status === 'pendente' || job.status === 'processando') {
          $('area-download').innerHTML = `${selo(job.status)}<p class="mudo pequeno">Download #${job.id}${job.tentativas > 1 ? ` · tentativa ${job.tentativas}/${job.maxTentativas}` : ''}${job.erro ? ` · último erro: ${esc(job.erro)}` : ''}</p>`;
          pollingAtual = setTimeout(tick, 3000);
        } else {
          renderizarAreaDownload(numero, { habilitado: true, ultimoJob: job });
        }
      } catch {
        pollingAtual = setTimeout(tick, 5000);
      }
    };
    pollingAtual = setTimeout(tick, 1500);
  }

  // ---------------------------------------------------------------- meus processos
  $('botao-atualizar-lista').addEventListener('click', carregarMeusProcessos);

  async function carregarMeusProcessos() {
    mostrarErro($('erro-lista'), '');
    $('lista-processos').innerHTML = '<div class="carregando">Carregando...</div>';
    try {
      const [meus, ativos] = await Promise.all([API.get('/processos'), API.get('/downloads?ativos=1')]);
      renderizarAndamento(ativos.itens);
      renderizarLista(meus.itens);
    } catch (err) {
      $('lista-processos').innerHTML = '';
      mostrarErro($('erro-lista'), err.message);
    }
  }

  function renderizarAndamento(jobs) {
    $('downloads-andamento').innerHTML = jobs.length
      ? `<div class="cartao cartao--discreto"><h3>Em andamento</h3><ul class="lista">${jobs
          .map((j) => `<li>${selo(j.status)} ${esc(j.numeroFormatado)} <span class="mudo">${esc(j.siglaTribunal || '')} · pedido em ${dataHora(j.criadoEm)}</span></li>`)
          .join('')}</ul></div>`
      : '';
  }

  function renderizarLista(itens) {
    if (!itens.length) {
      $('lista-processos').innerHTML = `<div class="cartao vazio">Nenhum processo baixado ainda. Consulte um processo e clique em <strong>Baixar processo</strong>.</div>`;
      return;
    }
    $('lista-processos').innerHTML = `
      <table class="tabela">
        <thead><tr><th>Processo</th><th>Tribunal</th><th>Classe</th><th>Último download</th><th>Arquivos</th><th></th></tr></thead>
        <tbody>
          ${itens.map((p) => `
            <tr>
              <td class="mono">${esc(p.numeroFormatado)}</td>
              <td>${esc(p.siglaTribunal || '—')}</td>
              <td>${esc(p.classe || '—')}</td>
              <td>${dataHora(p.ultimoDownloadEm)}</td>
              <td>${p.totalDocumentos}</td>
              <td><button class="botao botao--fantasma" data-detalhar="${esc(p.numero)}">Ver arquivos</button></td>
            </tr>
            <tr class="detalhe" data-detalhe="${esc(p.numero)}" hidden><td colspan="6"></td></tr>`).join('')}
        </tbody>
      </table>`;

    $('lista-processos').querySelectorAll('[data-detalhar]').forEach((b) =>
      b.addEventListener('click', () => alternarDetalhe(b.dataset.detalhar, b))
    );
  }

  async function alternarDetalhe(numero, botao) {
    const linha = document.querySelector(`[data-detalhe="${numero}"]`);
    if (!linha.hidden) {
      linha.hidden = true;
      botao.textContent = 'Ver arquivos';
      return;
    }
    linha.hidden = false;
    botao.textContent = 'Fechar';
    const celula = linha.querySelector('td');
    celula.innerHTML = '<div class="carregando">Carregando arquivos...</div>';
    try {
      const d = await API.get('/processos/' + numero);
      celula.innerHTML = d.documentos.length
        ? `<ul class="lista lista--arquivos">${d.documentos
            .map((doc) => `<li>
                <span>📄 ${esc(doc.nomeArquivo)} <span class="mudo">· ${tamanho(doc.tamanhoBytes)} · ${dataHora(doc.criadoEm)}</span></span>
                <button class="botao botao--pequeno" data-doc="${doc.id}" data-nome="${esc(doc.nomeArquivo)}">Baixar</button>
              </li>`)
            .join('')}</ul>`
        : '<p class="vazio">Sem arquivos.</p>';
      celula.querySelectorAll('[data-doc]').forEach((b) =>
        b.addEventListener('click', async () => {
          b.disabled = true;
          try {
            await API.baixarArquivo('/documentos/' + b.dataset.doc + '/download', b.dataset.nome);
          } catch (err) {
            alert(err.message);
          } finally {
            b.disabled = false;
          }
        })
      );
    } catch (err) {
      celula.innerHTML = `<p class="texto-erro">${esc(err.message)}</p>`;
    }
  }

  // ---------------------------------------------------------------- início
  abrirAba();
})();
