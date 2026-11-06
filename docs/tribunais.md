# Mapa de tribunais

Arquivo: `shared/tribunais/mapa_tribunais_cnj_brasil.json`, a referência de **qual tribunal é** a partir do número CNJ.

Conteúdo: **92 tribunais, 3 conselhos (CNJ, CJF, CSJT) e 12 circunscrições judiciárias militares**, agrupados pelos 9 segmentos.

## Número CNJ (Resolução CNJ 65/2008)

```
NNNNNNN-DD.AAAA.J.TR.OOOO
0000123-81.2024.5.09.0001
                │ │  └─ origem (vara do trabalho; 0000 = originário do tribunal)
                │ └──── TR: tribunal dentro do segmento (09 = TRT da 9ª Região)
                └────── J: segmento (5 = Justiça do Trabalho)
```

| J | Segmento | TR |
|---|---|---|
| 1 | STF | 00 |
| 2 | CNJ | 00 |
| 3 | STJ | 00 |
| 4 | Justiça Federal | 01–06 TRFs, 90 CJF |
| 5 | **Justiça do Trabalho** | **01–24 TRTs**, 00 TST, 90 CSJT |
| 6 | Justiça Eleitoral | 01–27 TREs (tabela de UFs), 00 TSE |
| 7 | Justiça Militar da União | 01–12 CJMs, 00 STM |
| 8 | Justiça Estadual | 01–27 TJs (tabela de UFs) |
| 9 | Justiça Militar Estadual | 13 MG, 21 RS, 26 SP |

Tabela de UFs (J = 6, 8 e 9): 01 AC, 02 AL, 03 AP, 04 AM, 05 BA, 06 CE, 07 DF, 08 ES, 09 GO, 10 MA, 11 MT, 12 MS, 13 MG, 14 PA, 15 PB, 16 PR, 17 PE, 18 PI, 19 RJ, 20 RN, 21 RS, 22 RO, 23 RR, 24 SC, 25 SE, 26 SP, 27 TO.

**Dígito verificador** (`DD`): `98 - (NNNNNNN AAAA J TR OOOO 00 mod 97)`. Implementado e testado em `shared/cnj.js`.

**Matéria não está no número**: cível, criminal, família etc. dependem da classe e do órgão julgador (vêm do DJEN / dos autos), não do trecho J.TR.

## Estrutura do JSON

```jsonc
{
  "versao": "1.0.0",
  "formato_numero": { ... },
  "escopo_atual": { "segmentos_com_download": ["5"] },
  "resumo": { "tribunais": 92, "conselhos": 3, "circunscricoes_militares": 12 },
  "segmentos": {
    "5": {
      "codigo": "5", "nome": "Justiça do Trabalho", "download_habilitado": true,
      "orgaos": [
        {
          "tr": "09", "sigla": "TRT9", "nome": "Tribunal Regional do Trabalho da 9ª Região",
          "tipo": "tribunal", "instancia": "segundo_grau", "ufs": ["PR"], "abrangencia": "Paraná", "sede": "Curitiba",
          "sistemas": ["PJe-JT"],
          "urls": { "portal": "...", "pje": "https://pje.trt9.jus.br", "consulta_publica": "https://pje.trt9.jus.br/consultaprocessual/" },
          "worker": { "adapter": "pje-jt", "status": "pendente" }
        }
      ]
    }
  }
}
```

`worker.status`: `pendente` (adapter ainda não baixa), `ok` (baixando), `fora_do_escopo_inicial`.

Para liberar download de um novo ramo no futuro: `download_habilitado: true` no segmento, `worker.adapter` nos órgãos e incluir o código em `DOWNLOAD_SEGMENTOS_HABILITADOS`.

## Fontes

- Resolução CNJ nº 65/2008, texto compilado (com a redação da Res. 477/2022, que criou o código do TRF6): https://atos.cnj.jus.br/atos/detalhar/119
- Tabela padronizada dos anexos: https://atos.cnj.jus.br/files/resolucao_65_16122008_04032013165912.pdf
