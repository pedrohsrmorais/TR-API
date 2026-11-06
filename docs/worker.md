# Worker e adapters

O worker é um processo Node com Playwright (Chromium) que consome a fila `download_jobs`.

```
worker/
├── index.js                      loop principal (libera travados → reserva → processa)
├── config/                       env, MySQL, S3
├── services/
│   ├── fila.service.js           reservar / heartbeat / concluir / falhar
│   ├── processamento.service.js  orquestra um job (adapter → S3 → banco)
│   └── armazenamento.service.js  upload S3 + sha256
├── adapters/
│   ├── index.js                  registro e resolução do adapter por tribunal
│   ├── simulacao/                gera PDF fictício (WORKER_SIMULACAO=true)
│   └── pje-jt/                   PJe da Justiça do Trabalho (24 TRTs)
│       ├── index.js              abre navegador, chama as etapas, tira print no erro
│       ├── etapas.js             abrirConsultaPublica / pesquisarProcesso / baixarIntegra
│       ├── seletores.js          seletores das telas (preencher com os prints)
│       └── particularidades.js   ajustes por regional, se algum TRT fugir do padrão
└── utils/                        logger, erros, gerador de PDF
```

## Contrato do adapter

```js
module.exports = {
  nome: 'pje-jt',
  async baixar({ job, identificacao, diretorio, log, sinal }) {
    // ... robô ...
    return {
      arquivos: [{ caminho: '/tmp/.../integra.pdf', nomeArquivo: '0000123-81.2024.5.09.0001_integra.pdf', contentType: 'application/pdf', tipo: 'integra' }],
      metadados: { /* qualquer coisa útil, vai para download_jobs.metadados */ },
    };
  },
};
```

- `identificacao` = retorno de `shared/tribunais.identificar()` (número decomposto + órgão do mapa, com `urls.consulta_publica`).
- O adapter **só** grava arquivos em `diretorio`. Upload, registro em `documentos` e vínculo em `usuarios_processos` são do `processamento.service`.
- `sinal` (AbortSignal) dispara no timeout do job (`WORKER_TIMEOUT_JOB_MS`): feche o navegador.
- Erros: use `utils/erros.js`
  - `ErroTemporario` → re-tenta com backoff (instabilidade, timeout, captcha que falhou)
  - `ProcessoIndisponivelError` → não re-tenta (não existe, sigiloso)
  - `NaoImplementadoError` → não re-tenta

Qual adapter cada tribunal usa está no mapa: `orgao.worker.adapter` (todos os TRTs → `pje-jt`).

## Debug

Quando o `pje-jt` falha, ele tira um **print da tela inteira** e o worker envia para o bucket em `debug/<jobId>/tentativa-N-erro.png`. A chave fica em `download_jobs.metadados.capturaTela`. Dá para abrir pelo console do MinIO (http://localhost:9001).

Para ver o navegador rodando, rode o worker fora do Docker com `WORKER_HEADLESS=false`:

```bash
cd worker && npm install && npx playwright install chromium
DB_HOST=localhost DB_PORTA=3307 S3_ENDPOINT=http://localhost:9000 S3_ACCESS_KEY=minioadmin S3_SECRET_KEY=minioadmin123 \
WORKER_SIMULACAO=false WORKER_HEADLESS=false node index.js
```

(pare o container antes: `docker compose stop worker`)

## Próximo passo: implementar o PJe-JT

Status atual: `abrirConsultaPublica` funciona; `pesquisarProcesso` e `baixarIntegra` lançam `NaoImplementadoError`. Com `WORKER_SIMULACAO=false`, um job de TRT abre a consulta pública, falha com a mensagem "ainda não implementado" e salva o print. Isso já valida navegador, rede e upload de debug.

Roteiro para cada tela (a partir dos prints/HTML):
1. Preencher `seletores.js`.
2. Implementar a etapa em `etapas.js`.
3. Testar com `WORKER_HEADLESS=false` num processo real de cada TRT.
4. Se algum TRT diferir, registrar em `particularidades.js` em vez de duplicar o adapter.
5. Atualizar `worker.status` do TRT no mapa (`pendente` → `ok`).

Pontos de atenção conhecidos do PJe-JT: desafio/captcha na consulta pública, processos em segredo de justiça, e documentos que exigem login com certificado digital.
