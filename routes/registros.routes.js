const express = require('express');
const RegistroController = require('../controllers/RegistroController');

const router = express.Router();
const controlador = new RegistroController();

router.get('/', (req, res) => controlador.listar(req, res));
router.get('/:id', (req, res) => controlador.obtenerPorId(req, res));
router.post('/', (req, res) => controlador.crear(req, res));
router.put('/:id', (req, res) => controlador.actualizar(req, res));
router.delete('/:id', (req, res) => controlador.eliminar(req, res));

module.exports = router;