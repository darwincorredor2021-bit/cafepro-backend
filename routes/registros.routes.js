// =====================================================================
// routes/registros.routes.js — Rutas de registros de cosecha
// Todas cuelgan de /api/registros (se define en app.js).
// =====================================================================

const express = require('express');
const RegistroController = require('../controllers/RegistroController');

const router = express.Router();
const controlador = new RegistroController();

// GET /api/registros → listar registros (con ?usuario_id=1 solo los de ese agricultor).
router.get('/', (req, res) => controlador.listar(req, res));

// GET /api/registros/:id → obtener un registro.
router.get('/:id', (req, res) => controlador.obtenerPorId(req, res));

// POST /api/registros → crear un registro de cosecha.
router.post('/', (req, res) => controlador.crear(req, res));

// PUT /api/registros/:id → actualizar un registro.
router.put('/:id', (req, res) => controlador.actualizar(req, res));

// DELETE /api/registros/:id → eliminar un registro.
router.delete('/:id', (req, res) => controlador.eliminar(req, res));

module.exports = router;
