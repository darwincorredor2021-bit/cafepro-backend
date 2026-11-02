const express = require('express');
const UsuarioController = require('../controllers/UsuarioController');

const router = express.Router();
const controlador = new UsuarioController(); // creamos el objeto a partir de la clase

// Usamos funciones flecha para que "this" siga apuntando al controlador
router.post('/login', (req, res) => controlador.login(req, res));
router.get('/', (req, res) => controlador.listar(req, res));
router.get('/:id', (req, res) => controlador.obtenerPorId(req, res));
router.post('/', (req, res) => controlador.crear(req, res));
router.put('/:id', (req, res) => controlador.actualizar(req, res));
router.delete('/:id', (req, res) => controlador.eliminar(req, res));

module.exports = router;