'use strict';

const { Router } = require('express');
const controller = require('../controllers/documentos.controller');

const router = Router();

router.get('/:id/download', controller.baixar);

module.exports = router;
