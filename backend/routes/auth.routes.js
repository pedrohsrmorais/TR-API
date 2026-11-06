'use strict';

const { Router } = require('express');
const controller = require('../controllers/auth.controller');
const { autenticar } = require('../middlewares/autenticar');
const { limitarLogin } = require('../middlewares/limitarRequisicoes');

const router = Router();

router.post('/login', limitarLogin, controller.login);
router.get('/eu', autenticar, controller.eu);

module.exports = router;
