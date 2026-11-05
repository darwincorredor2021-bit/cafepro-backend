// =====================================================================
// routes/noticias.routes.js — Ruta de noticias
// Cuelga de /api/noticias (se define en app.js).
// =====================================================================

const express = require('express');
const NoticiasController = require('../controllers/NoticiasController');

const router = express.Router();
const controlador = new NoticiasController();

// GET /api/noticias → últimas noticias del sector cafetero.
router.get('/', (req, res) => controlador.obtener(req, res));

module.exports = router;
