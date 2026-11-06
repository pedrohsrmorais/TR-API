'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const usuariosRepo = require('../repositories/usuarios.repository');

// hash real de uma senha qualquer, usado quando o e-mail não existe (tempo de resposta igual)
const HASH_FICTICIO = bcrypt.hashSync('usuario-inexistente', 12);

const publico = (u) => ({ id: u.id, nome: u.nome, email: u.email, perfil: u.perfil });

async function login(email, senha) {
  if (!email || !senha) throw AppError.requisicaoInvalida('Informe e-mail e senha.');

  const usuario = await usuariosRepo.buscarPorEmail(String(email).trim().toLowerCase());
  // compara mesmo sem usuário para não vazar, pelo tempo de resposta, quais e-mails existem
  const hash = usuario ? usuario.senha_hash : HASH_FICTICIO;
  const senhaOk = await bcrypt.compare(String(senha), hash);

  if (!usuario || !senhaOk) throw AppError.naoAutenticado('E-mail ou senha inválidos.');
  if (!usuario.ativo) throw AppError.proibido('Usuário desativado.');

  await usuariosRepo.registrarLogin(usuario.id);

  const token = jwt.sign({ sub: String(usuario.id), email: usuario.email, perfil: usuario.perfil }, config.jwt.segredo, {
    expiresIn: config.jwt.expiraEm,
  });

  return { token, usuario: publico(usuario) };
}

function verificarToken(token) {
  try {
    return jwt.verify(token, config.jwt.segredo);
  } catch {
    throw AppError.naoAutenticado('Sessão inválida ou expirada. Faça login novamente.');
  }
}

module.exports = { login, verificarToken, publico };
