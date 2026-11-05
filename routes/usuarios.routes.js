// =====================================================================
// routes/usuarios.routes.js — Rutas de usuarios (agricultores)
// Une cada URL con el método del controlador que la atiende.
// Todas cuelgan de /api/usuarios (se define en app.js).
// =====================================================================

const express = require('express');
const UsuarioController = require('../controllers/UsuarioController');

const router = express.Router();
const controlador = new UsuarioController(); // se crea un objeto a partir de la clase

// Se usan funciones flecha para que "this" siga apuntando al controlador
// cuando Express ejecute el método.

// POST /api/usuarios/login → iniciar sesión.
// Va primero para que "login" no se confunda con un :id.
router.post('/login', (req, res) => controlador.login(req, res));

// GET /api/usuarios → listar todos los usuarios.
router.get('/', (req, res) => controlador.listar(req, res));

// GET /api/usuarios/:id → obtener un usuario.
router.get('/:id', (req, res) => controlador.obtenerPorId(req, res));

// POST /api/usuarios → crear un usuario.
router.post('/', (req, res) => controlador.crear(req, res));

// PUT /api/usuarios/:id → actualizar un usuario.
router.put('/:id', (req, res) => controlador.actualizar(req, res));

// DELETE /api/usuarios/:id → eliminar un usuario (y sus registros).
router.delete('/:id', (req, res) => controlador.eliminar(req, res));

module.exports = router;
