const express = require('express');
const router = express.Router();
const { obtenerNoticiasCafeteras } = require('../controllers/NoticiasController');

router.get('/', obtenerNoticiasCafeteras);

module.exports = router;