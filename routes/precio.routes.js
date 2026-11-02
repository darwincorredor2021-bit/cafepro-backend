const express = require('express');
const router = express.Router();
const { obtenerPrecioCafé } = require('../controllers/PrecioController');

// Ruta GET para el precio del café
router.get('/', obtenerPrecioCafé);

module.exports = router;