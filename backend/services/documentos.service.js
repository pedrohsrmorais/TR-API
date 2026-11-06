'use strict';

const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { s3 } = require('../config/storage');
const AppError = require('../utils/AppError');
const documentosRepo = require('../repositories/documentos.repository');
const processosRepo = require('../repositories/processos.repository');

/**
 * Abre o arquivo no S3 para o usuário, conferindo se ele tem acesso ao processo.
 * O backend faz o streaming (em vez de URL pré-assinada) para não expor o
 * endpoint interno do MinIO ao navegador. Na AWS dá para trocar por URL pré-assinada.
 */
async function abrir(usuario, documentoId) {
  const doc = await documentosRepo.buscarPorId(documentoId);
  if (!doc) throw AppError.naoEncontrado('Documento não encontrado.');

  if (usuario.perfil !== 'admin') {
    const vinculo = await processosRepo.buscarVinculo(usuario.id, doc.processo_id);
    if (!vinculo) throw AppError.naoEncontrado('Documento não encontrado.');
  }

  let objeto;
  try {
    objeto = await s3.send(new GetObjectCommand({ Bucket: doc.s3_bucket, Key: doc.s3_chave }));
  } catch (err) {
    const status = err.$metadata && err.$metadata.httpStatusCode;
    if (status === 404) throw AppError.naoEncontrado('Arquivo não está mais no armazenamento.');
    throw err;
  }

  return { documento: doc, corpo: objeto.Body, tamanho: objeto.ContentLength };
}

module.exports = { abrir };
