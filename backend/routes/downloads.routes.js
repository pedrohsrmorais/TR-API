'use strict';

const { Router } = require('express');
const controller = require('../controllers/downloads.controller');

const router = Router();

router.get('/', controller.listar);
router.get('/:id', controller.detalhar);

module.exports = router;
