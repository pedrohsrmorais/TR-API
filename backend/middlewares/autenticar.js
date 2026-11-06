'use strict';

const AppError = require('../utils/AppError');
const { verificarToken, publico } = require('../services/auth.service');
const usuariosRepo = require('../repositories/usuarios.repository');

/**
 * Exige "Authorization: Bearer <jwt>". Recarrega o usuário do banco a cada
 * requisição para que desativar um usuário tenha efeito imediato.
 */
async function autenticar(req, _res, next) {
  const cabecalho = req.headers.authorization || '';
  const [tipo, token] = cabecalho.split(' ');
  if (tipo !== 'Bearer' || !token) throw AppError.naoAutenticado();

  const payload = verificarToken(token);
  const usuario = await usuariosRepo.buscarPorId(Number(payload.sub));
  if (!usuario || !usuario.ativo) throw AppError.naoAutenticado('Usuário inexistente ou desativado.');

  req.usuario = publico(usuario);
  next();
}

/** Restringe a rota a determinados perfis. Usar depois de autenticar. */
const exigirPerfil = (...perfis) => (req, _res, next) => {
  if (!req.usuario || !perfis.includes(req.usuario.perfil)) throw AppError.proibido();
  next();
};

module.exports = { autenticar, exigirPerfil };
