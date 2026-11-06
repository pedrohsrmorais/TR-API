'use strict';

/**
 * Configuração central. Tudo vem de variáveis de ambiente (docker-compose.yml).
 */

const num = (v, padrao) => (v === undefined || v === '' ? padrao : Number(v));
const bool = (v, padrao) => (v === undefined || v === '' ? padrao : ['1', 'true', 'sim', 'yes'].includes(String(v).toLowerCase()));
const lista = (v, padrao) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : padrao);

const config = {
  ambiente: process.env.NODE_ENV || 'development',
  porta: num(process.env.PORTA, 3041),
  logNivel: process.env.LOG_NIVEL || 'info',

  // Deve bater com a última linha de schema_info no database/init.sql
  schemaVersaoEsperada: '0.1.0',

  jwt: {
    segredo: process.env.JWT_SEGREDO || 'dev-troque-este-segredo-em-producao',
    expiraEm: process.env.JWT_EXPIRA_EM || '12h',
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    porta: num(process.env.DB_PORTA, 3306),
    nome: process.env.DB_NOME || 'tr_api',
    usuario: process.env.DB_USUARIO || 'tr_api',
    senha: process.env.DB_SENHA || 'tr_api_dev',
    conexoes: num(process.env.DB_CONEXOES, 10),
  },

  s3: {
    endpoint: process.env.S3_ENDPOINT || undefined, // vazio = AWS S3 real
    regiao: process.env.S3_REGIAO || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'tr-api-processos',
    accessKey: process.env.S3_ACCESS_KEY || undefined, // vazio = cadeia padrão da AWS (IAM role etc.)
    secretKey: process.env.S3_SECRET_KEY || undefined,
    forcarPathStyle: bool(process.env.S3_FORCAR_PATH_STYLE, true),
    criarBucket: bool(process.env.S3_CRIAR_BUCKET, false),
  },

  djen: {
    baseUrl: (process.env.DJEN_BASE_URL || 'https://comunicaapi.pje.jus.br').replace(/\/+$/, ''),
    timeoutMs: num(process.env.DJEN_TIMEOUT_MS, 20000),
    itensPorPagina: num(process.env.DJEN_ITENS_POR_PAGINA, 50),
    maxPaginas: num(process.env.DJEN_MAX_PAGINAS, 10),
    mock: bool(process.env.DJEN_MOCK, false),
  },

  download: {
    segmentosHabilitados: lista(process.env.DOWNLOAD_SEGMENTOS_HABILITADOS, ['5']),
  },
};

if (config.ambiente === 'production' && config.jwt.segredo.startsWith('dev-')) {
  // não derruba a aplicação (ambiente local roda como production), mas deixa claro
  console.warn('[config] JWT_SEGREDO está com o valor de desenvolvimento. Defina um segredo real antes de expor a aplicação.');
}

module.exports = config;
