const express = require('express');
const router = express.Router();
const { obtenerNoticiasCafeteras } = require('../controllers/NoticiasController');

router.get('/noticias', obtenerNoticiasCafeteras);

module.exports = router;