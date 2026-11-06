-- =============================================================================
-- TR-API: estado ATUAL e COMPLETO do banco de dados.
--
-- Regra do projeto: este arquivo sempre reflete o schema mais recente.
-- Toda mudança de tabela/coluna/índice é feita AQUI e a versão em schema_info
-- é incrementada (e também em backend/config/index.js -> schemaVersaoEsperada).
--
-- O MySQL só executa este script quando o volume de dados está VAZIO.
-- Depois de mudar o schema: `make reset` (ou `docker compose down -v && docker compose up -d --build`).
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS tr_api
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE tr_api;

-- -----------------------------------------------------------------------------
-- Versão do schema (o backend confere na subida e avisa se estiver desatualizado)
-- -----------------------------------------------------------------------------
CREATE TABLE schema_info (
  versao       VARCHAR(20)  NOT NULL,
  descricao    VARCHAR(255) NOT NULL,
  aplicado_em  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (versao)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Usuários
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome             VARCHAR(150)    NOT NULL,
  email            VARCHAR(190)    NOT NULL,
  senha_hash       VARCHAR(255)    NOT NULL,
  perfil           ENUM('admin','usuario') NOT NULL DEFAULT 'usuario',
  ativo            TINYINT(1)      NOT NULL DEFAULT 1,
  ultimo_login_em  DATETIME        NULL,
  criado_em        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_email (email)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Processos (um registro por número CNJ, compartilhado entre usuários)
-- -----------------------------------------------------------------------------
CREATE TABLE processos (
  id                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  numero_cnj               CHAR(20)        NOT NULL COMMENT 'Somente dígitos',
  numero_formatado         VARCHAR(25)     NOT NULL COMMENT 'NNNNNNN-DD.AAAA.J.TR.OOOO',
  ano                      SMALLINT UNSIGNED NOT NULL,
  segmento_justica         CHAR(1)         NOT NULL COMMENT 'Campo J (5 = Justiça do Trabalho)',
  codigo_tribunal          CHAR(2)         NOT NULL COMMENT 'Campo TR',
  codigo_origem            CHAR(4)         NOT NULL COMMENT 'Campo OOOO',
  sigla_tribunal           VARCHAR(20)     NULL COMMENT 'Ex.: TRT9 (vem do mapa de tribunais)',
  orgao                    VARCHAR(255)    NULL COMMENT 'Último órgão visto no DJEN',
  classe                   VARCHAR(255)    NULL COMMENT 'Última classe vista no DJEN',
  ultima_consulta_djen_em  DATETIME        NULL,
  criado_em                DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_processos_numero (numero_cnj),
  KEY idx_processos_tribunal (segmento_justica, codigo_tribunal)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Consultas ao DJEN (histórico + cache do overview)
-- -----------------------------------------------------------------------------
CREATE TABLE consultas_djen (
  id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  processo_id         BIGINT UNSIGNED NOT NULL,
  usuario_id          BIGINT UNSIGNED NOT NULL,
  sucesso             TINYINT(1)      NOT NULL,
  total_comunicacoes  INT UNSIGNED    NOT NULL DEFAULT 0,
  overview            JSON            NULL COMMENT 'Overview já processado (o que o front exibe)',
  resposta_bruta      JSON            NULL COMMENT 'Itens crus retornados pelo DJEN',
  erro                VARCHAR(500)    NULL,
  duracao_ms          INT UNSIGNED    NULL,
  criado_em           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consultas_processo (processo_id, criado_em),
  CONSTRAINT fk_consultas_processo FOREIGN KEY (processo_id) REFERENCES processos (id) ON DELETE CASCADE,
  CONSTRAINT fk_consultas_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Fila de downloads (consumida pelo worker com SELECT ... FOR UPDATE SKIP LOCKED)
-- -----------------------------------------------------------------------------
CREATE TABLE download_jobs (
  id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  processo_id           BIGINT UNSIGNED NOT NULL,
  usuario_id            BIGINT UNSIGNED NOT NULL,
  status                ENUM('pendente','processando','concluido','erro','cancelado') NOT NULL DEFAULT 'pendente',
  tentativas            TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_tentativas        TINYINT UNSIGNED NOT NULL DEFAULT 3,
  proxima_tentativa_em  DATETIME        NULL,
  adapter               VARCHAR(50)     NULL COMMENT 'Adapter do worker que processou (ex.: pje-jt)',
  worker_id             VARCHAR(100)    NULL,
  heartbeat_em          DATETIME        NULL COMMENT 'Atualizado pelo worker enquanto processa',
  iniciado_em           DATETIME        NULL,
  finalizado_em         DATETIME        NULL,
  erro_mensagem         TEXT            NULL,
  metadados             JSON            NULL,
  criado_em             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_jobs_fila (status, proxima_tentativa_em, criado_em),
  KEY idx_jobs_usuario_processo (usuario_id, processo_id),
  CONSTRAINT fk_jobs_processo FOREIGN KEY (processo_id) REFERENCES processos (id) ON DELETE CASCADE,
  CONSTRAINT fk_jobs_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios (id)  ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Documentos baixados (arquivos no S3/MinIO)
-- -----------------------------------------------------------------------------
CREATE TABLE documentos (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  processo_id      BIGINT UNSIGNED NOT NULL,
  download_job_id  BIGINT UNSIGNED NOT NULL,
  tipo             ENUM('integra','documento','outro') NOT NULL DEFAULT 'integra',
  nome_arquivo     VARCHAR(255)    NOT NULL,
  s3_bucket        VARCHAR(100)    NOT NULL,
  s3_chave         VARCHAR(500)    NOT NULL,
  content_type     VARCHAR(100)    NOT NULL DEFAULT 'application/pdf',
  tamanho_bytes    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  sha256           CHAR(64)        NULL,
  criado_em        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_documentos_processo (processo_id, criado_em),
  KEY idx_documentos_job (download_job_id),
  CONSTRAINT fk_documentos_processo FOREIGN KEY (processo_id)     REFERENCES processos (id)     ON DELETE CASCADE,
  CONSTRAINT fk_documentos_job      FOREIGN KEY (download_job_id) REFERENCES download_jobs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Vínculo usuário <-> processo baixado ("Meus processos")
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios_processos (
  usuario_id              BIGINT UNSIGNED NOT NULL,
  processo_id             BIGINT UNSIGNED NOT NULL,
  ultimo_download_job_id  BIGINT UNSIGNED NULL,
  criado_em               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, processo_id),
  KEY idx_up_processo (processo_id),
  CONSTRAINT fk_up_usuario  FOREIGN KEY (usuario_id)             REFERENCES usuarios (id)      ON DELETE CASCADE,
  CONSTRAINT fk_up_processo FOREIGN KEY (processo_id)            REFERENCES processos (id)     ON DELETE CASCADE,
  CONSTRAINT fk_up_job      FOREIGN KEY (ultimo_download_job_id) REFERENCES download_jobs (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================================
-- Dados iniciais
-- =============================================================================
INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES
  ('Administrador', 'admin@intellsn.com.br', '$2a$12$XZ5BjwrYpOJ7Q6M0peBiPuzPjnPAe3I3vufOMxwx77.Tw1qHMJlWS', 'admin');

INSERT INTO schema_info (versao, descricao) VALUES
  ('0.1.0', 'Estrutura inicial: usuários, processos, consultas DJEN, fila de downloads, documentos e vínculos.');
