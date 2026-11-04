const express = require('express');
const PrecioController = require('../controllers/PrecioController');

const router = express.Router();
const controlador = new PrecioController();

// GET /api/precio  → precio estimado de la carga de 125 kg en pesos colombianos
router.get('/', (req, res) => controlador.obtener(req, res));

module.exports = router;
