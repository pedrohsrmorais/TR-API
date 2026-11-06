# API

Base: `http://localhost:3041/api` (via nginx). Todas as rotas, exceto `health` e `auth/login`, exigem `Authorization: Bearer <token>`.

Erros seguem sempre o formato:

```json
{ "erro": { "codigo": "REQUISICAO_INVALIDA", "mensagem": "Dígito verificador inválido. Confira o número digitado.", "detalhes": {} } }
```

| Código HTTP | `codigo` | Quando |
|---|---|---|
| 400 | `REQUISICAO_INVALIDA` | número CNJ inválido, JSON malformado, campos faltando |
| 401 | `NAO_AUTENTICADO` | sem token, token expirado, login inválido |
| 403 | `PROIBIDO` | usuário desativado / sem perfil |
| 404 | `NAO_ENCONTRADO` | recurso não existe ou não pertence ao usuário |
| 422 | `DOWNLOAD_INDISPONIVEL` | download não liberado para esse ramo/tribunal |
| 429 | `MUITAS_REQUISICOES` | rate limit (login: 20/15 min por IP; consulta: 30/min por usuário) |
| 502 | `SERVICO_EXTERNO` | DJEN fora do ar / limitou / timeout (sem cache disponível) |

## Endpoints

### `GET /health`
Status da API e do banco. `200` ok, `503` banco fora.

### `POST /auth/login`
```json
{ "email": "admin@intellsn.com.br", "senha": "..." }
```
→ `{ "token": "...", "usuario": { "id": 1, "nome": "Administrador", "email": "...", "perfil": "admin" } }`

### `GET /auth/eu`
Usuário do token.

### `GET /tribunais/identificar/:numero`
Só identifica, sem chamada externa. Aceita com ou sem máscara.
→ `{ numero: {valido, formatado, segmento, tribunal, origem, ...}, segmento, orgao, download: {habilitado, motivo} }`

### `GET /tribunais[?segmento=5]`
Mapa completo ou só um segmento.

### `POST /processos/consultar`
```json
{ "numero": "0000123-81.2024.5.09.0001" }
```
→
```jsonc
{
  "processo": { "id": 1, "numero": "00001238120245090001", "numeroFormatado": "0000123-81.2024.5.09.0001", "ano": "2024" },
  "tribunal": { "segmento": { "codigo": "5", "nome": "Justiça do Trabalho" }, "orgao": { "sigla": "TRT9", "urls": { ... } } },
  "download": { "habilitado": true, "motivo": null, "noMeusProcessos": false, "ultimoJob": null },
  "djen": { "origem": "api", "consultadoEm": "2026-11-06T14:00:00.000Z", "aviso": null }, // origem: api | mock | cache
  "overview": {
    "encontrado": true,
    "tribunalDjen": "TRT9",
    "orgao": "1ª Vara do Trabalho de Curitiba",
    "classe": { "atual": "AÇÃO TRABALHISTA - RITO ORDINÁRIO", "codigo": "985", "historico": [ ... ] },
    "partes": [ { "nome": "...", "polo": "ativo" } ],
    "advogados": [ { "nome": "...", "oab": "12345/PR" } ],
    "totalComunicacoes": 8,
    "periodo": { "primeira": "2025-11-14", "ultima": "2026-10-02" },
    "comunicacoes": [ { "data": "2026-10-02", "tipo": "Intimação", "texto": "...", "link": "...", "orgao": "..." } ]
  }
}
```

### `POST /processos/:numero/download`
Enfileira o download da íntegra. `202` quando cria, `200` quando já existia um job ativo (idempotente).
→ `{ "criado": true, "job": { "id": 7, "status": "pendente", ... } }`

### `GET /downloads[?ativos=1]`
Jobs do usuário (os 50 mais recentes).

### `GET /downloads/:id`
Status de um job (o front faz polling a cada 3 s). `status`: `pendente | processando | concluido | erro | cancelado`.

### `GET /processos`
"Meus processos": processos baixados pelo usuário, com total de arquivos e último download.

### `GET /processos/:numero`
Detalhe de um processo do usuário: documentos (todas as versões), último job, último overview salvo.

### `GET /documentos/:id/download`
Streaming do arquivo (`Content-Disposition: attachment`).
