'use strict';

/**
 * Cliente S3. Em desenvolvimento aponta para o MinIO; em produção basta remover
 * S3_ENDPOINT (e as chaves, se usar IAM role) para falar com a AWS.
 */

const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
const config = require('./index');
const logger = require('../utils/logger');

const s3 = new S3Client({
  region: config.s3.regiao,
  endpoint: config.s3.endpoint,
  forcePathStyle: config.s3.forcarPathStyle,
  // SDK v3 recente usa checksum em trailer (aws-chunked) por padrão; nem todo S3 compatível
  // (MinIO antigo, R2, s3rver...) decodifica. WHEN_REQUIRED funciona em todos, inclusive na AWS.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  credentials:
    config.s3.accessKey && config.s3.secretKey
      ? { accessKeyId: config.s3.accessKey, secretAccessKey: config.s3.secretKey }
      : undefined,
});

async function garantirBucket() {
  const Bucket = config.s3.bucket;
  try {
    await s3.send(new HeadBucketCommand({ Bucket }));
    logger.info(`Bucket S3 "${Bucket}" disponível.`);
  } catch (err) {
    const status = err.$metadata && err.$metadata.httpStatusCode;
    if (status === 404 && config.s3.criarBucket) {
      await s3.send(new CreateBucketCommand({ Bucket }));
      logger.info(`Bucket S3 "${Bucket}" criado.`);
      return;
    }
    throw new Error(`Bucket S3 "${Bucket}" inacessível (${status || err.name}). ${status === 404 ? 'Habilite S3_CRIAR_BUCKET ou crie o bucket.' : ''}`);
  }
}

module.exports = { s3, garantirBucket };
