'use strict';

const { S3Client } = require('@aws-sdk/client-s3');
const config = require('./index');

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

module.exports = { s3 };
