'use strict';

const { Router } = require('express');
const controller = require('../controllers/tribunais.controller');

const router = Router();

router.get('/', controller.listar);
router.get('/identificar/:numero', controller.identificar);

module.exports = router;
