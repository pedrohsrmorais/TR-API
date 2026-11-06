'use strict';

const { Router } = require('express');
const { autenticar } = require('../middlewares/autenticar');

const router = Router();

// públicas
router.use('/health', require('./health.routes'));
router.use('/auth', require('./auth.routes'));

// daqui para baixo, tudo exige login
router.use(autenticar);
router.use('/tribunais', require('./tribunais.routes'));
router.use('/processos', require('./processos.routes'));
router.use('/downloads', require('./downloads.routes'));
router.use('/documentos', require('./documentos.routes'));

module.exports = router;
