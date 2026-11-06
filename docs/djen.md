# DJEN (Diário de Justiça Eletrônico Nacional)

API pública do CNJ (Comunica PJe), sem token.

```
GET https://comunicaapi.pje.jus.br/api/v1/comunicacao
    ?numeroProcesso=00001238120245090001   (20 dígitos, sem máscara)
    &pagina=1&itensPorPagina=50
```

Outros filtros (não usados ainda): `numeroOab` + `ufOab`, `nomeParte`, `siglaTribunal`, `dataDisponibilizacaoInicio/Fim`. Exemplos na collection do Postman que originou a integração.

## O que vem

Uma lista de **publicações** (intimações, editais, citações), não o andamento completo. Campos usados no overview:

| Campo DJEN | Uso |
|---|---|
| `data_disponibilizacao` | data na linha do tempo |
| `siglaTribunal`, `nomeOrgao` | tribunal e vara |
| `nomeClasse`, `codigoClasse` | classe atual e histórico (ex.: MONITÓRIA → EXECUÇÃO). O DJEN às vezes manda caixa quebrada ("EXECUçãO"); normalizamos para caixa alta pt-BR. |
| `tipoComunicacao`, `texto` | o que foi publicado (HTML é convertido em texto) |
| `destinatarios[].nome/polo` | partes intimadas (`A` ativo, `P` passivo) |
| `destinatarioadvogados[].advogado` | advogados com OAB |
| `link` | link para abrir no sistema do tribunal |

Implementação: `backend/services/djen.service.js` (HTTP + paginação) e `backend/services/overview.service.js` (transformação, função pura e testada).

## Configuração

| Variável | Padrão | |
|---|---|---|
| `DJEN_BASE_URL` | `https://comunicaapi.pje.jus.br` | |
| `DJEN_TIMEOUT_MS` | `20000` | por página |
| `DJEN_ITENS_POR_PAGINA` | `50` | |
| `DJEN_MAX_PAGINAS` | `10` | limite de segurança (até 500 publicações) |
| `DJEN_MOCK` | `false` | `true` lê `backend/fixtures/djen/<numero>.json` (sem rede) |

## Resiliência

- HTTP 429 / 5xx / timeout viram erro `502 SERVICO_EXTERNO` com mensagem legível.
- Se já existe consulta anterior com sucesso, a API devolve ela com `djen.origem = "cache"` e um aviso, em vez de falhar.
- Rate limit interno: 30 consultas/min por usuário, para não sermos bloqueados pelo CNJ.

## Fixture

`backend/fixtures/djen/00406612620258160001.json` é uma resposta real (TJPR) usada nos testes e no modo mock. Para adicionar outra: salve a resposta como `<20 dígitos>.json` na mesma pasta.
