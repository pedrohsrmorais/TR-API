'use strict';

const fs = require('fs');
const crypto = require('crypto');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('../config');
const { s3 } = require('../config/storage');

async function sha256Arquivo(caminho) {
  const hash = crypto.createHash('sha256');
  for await (const pedaco of fs.createReadStream(caminho)) hash.update(pedaco);
  return hash.digest('hex');
}

/**
 * Chave padrão no bucket:
 *   processos/{J}/{SIGLA}/{numero20}/{jobId}/{arquivo}
 * Cada download vira uma "versão" (pasta do job), sem sobrescrever downloads anteriores.
 */
function montarChave({ segmento, sigla, numero, jobId, nomeArquivo }) {
  const limpo = (s) => String(s || 'desconhecido').replace(/[^A-Za-z0-9._-]+/g, '_');
  return `processos/${limpo(segmento)}/${limpo(sigla)}/${limpo(numero)}/${jobId}/${limpo(nomeArquivo)}`;
}

/** Envia um arquivo local para o S3/MinIO. */
async function enviarArquivo({ caminho, chave, contentType }) {
  const { size } = await fs.promises.stat(caminho);
  const sha256 = await sha256Arquivo(caminho);
  await s3.send(
    new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: chave,
      Body: fs.createReadStream(caminho),
      ContentLength: size,
      ContentType: contentType || 'application/octet-stream',
      Metadata: { sha256 },
    })
  );
  return { bucket: config.s3.bucket, chave, tamanhoBytes: size, sha256 };
}

module.exports = { montarChave, enviarArquivo, sha256Arquivo };
