'use strict';

const { Router } = require('express');
const controller = require('../controllers/processos.controller');
const { limitarConsultaDjen } = require('../middlewares/limitarRequisicoes');

const router = Router();

router.get('/', controller.listarMeus);
router.post('/consultar', limitarConsultaDjen, controller.consultar);
router.get('/:numero', controller.detalhar);
router.post('/:numero/download', controller.solicitarDownload);

module.exports = router;
