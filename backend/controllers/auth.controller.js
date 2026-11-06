'use strict';

const authService = require('../services/auth.service');

async function login(req, res) {
  const { email, senha } = req.body || {};
  res.json(await authService.login(email, senha));
}

async function eu(req, res) {
  res.json({ usuario: req.usuario });
}

module.exports = { login, eu };
