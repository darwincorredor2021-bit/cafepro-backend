// =====================================================================
// controllers/UsuarioController.js — Gestión de usuarios (agricultores)
// Contiene el CRUD completo de usuarios (crear, leer, actualizar y
// eliminar) y el inicio de sesión (login). Cada método recibe la
// petición (`req`) y la respuesta (`res`) de Express.
// =====================================================================

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const BaseController = require('./BaseController');

class UsuarioController extends BaseController {
  constructor() {
    super(); // obligatorio al heredar: ejecuta el constructor de la clase padre
    this.saltRounds = 10; // "fuerza" del cifrado de contraseñas (más alto = más seguro y más lento)
  }

  /**
   * GET /api/usuarios
   * Devuelve la lista de todos los usuarios.
   * Nunca se incluye el password_hash en la respuesta.
   */
  async listar(req, res) {
    try {
      const usuarios = await db.query(
        'SELECT id, nombre_agricultor, nombre_cafetal, created_at FROM usuarios ORDER BY id'
      );
      res.json(usuarios);
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  /**
   * GET /api/usuarios/:id
   * Devuelve un solo usuario según el id de la URL.
   * Responde 404 si no existe.
   */
  async obtenerPorId(req, res) {
    try {
      const filas = await db.query(
        'SELECT id, nombre_agricultor, nombre_cafetal, created_at FROM usuarios WHERE id = ?',
        [req.params.id]
      );
      if (filas.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      res.json(filas[0]);
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  /**
   * POST /api/usuarios
   * Crea un usuario nuevo. Recibe en el cuerpo (JSON):
   * nombre_agricultor, nombre_cafetal y password.
   * La contraseña se cifra con bcrypt antes de guardarse.
   * Responde 201 si se creó, 400 si faltan datos y 409 si el cafetal ya existe.
   */
  async crear(req, res) {
    try {
      const { nombre_agricultor, nombre_cafetal, password } = req.body || {};

      // Validación: los tres campos son obligatorios.
      if (!nombre_agricultor || !nombre_cafetal || !password) {
        return res.status(400).json({
          mensaje: 'Faltan campos: nombre_agricultor, nombre_cafetal y password son obligatorios'
        });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
      }

      // Se guarda el hash (versión cifrada), nunca la contraseña real.
      const passwordHash = await bcrypt.hash(String(password), this.saltRounds);

      const resultado = await db.query(
        'INSERT INTO usuarios (nombre_agricultor, nombre_cafetal, password_hash) VALUES (?, ?, ?)',
        [nombre_agricultor.trim(), nombre_cafetal.trim(), passwordHash]
      );

      res.status(201).json({
        mensaje: 'Usuario creado correctamente',
        usuario: {
          id: resultado.insertId, // id que MySQL asignó automáticamente
          nombre_agricultor: nombre_agricultor.trim(),
          nombre_cafetal: nombre_cafetal.trim()
        }
      });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  /**
   * PUT /api/usuarios/:id
   * Actualiza los datos de un usuario. Todos los campos son opcionales:
   * los que no se envíen conservan el valor que ya tenían.
   */
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre_agricultor, nombre_cafetal, password } = req.body || {};

      // Primero se verifica que el usuario exista.
      const filas = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (filas.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      const actual = filas[0];

      // Si no mandan un dato, se conserva el que ya había.
      const nuevoAgricultor = (nombre_agricultor || actual.nombre_agricultor).trim();
      const nuevoCafetal = (nombre_cafetal || actual.nombre_cafetal).trim();
      let nuevoHash = actual.password_hash;

      // Solo se vuelve a cifrar la contraseña si enviaron una nueva.
      if (password) {
        if (String(password).length < 6) {
          return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
        }
        nuevoHash = await bcrypt.hash(String(password), this.saltRounds);
      }

      await db.query(
        'UPDATE usuarios SET nombre_agricultor = ?, nombre_cafetal = ?, password_hash = ? WHERE id = ?',
        [nuevoAgricultor, nuevoCafetal, nuevoHash, id]
      );

      res.json({
        mensaje: 'Usuario actualizado correctamente',
        usuario: { id: Number(id), nombre_agricultor: nuevoAgricultor, nombre_cafetal: nuevoCafetal }
      });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  /**
   * DELETE /api/usuarios/:id
   * Elimina un usuario. Gracias a ON DELETE CASCADE de la base de datos,
   * también se borran todos sus registros de cosecha.
   */
  async eliminar(req, res) {
    try {
      const resultado = await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
      // affectedRows indica cuántas filas se borraron: 0 significa que el id no existía.
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  /**
   * POST /api/usuarios/login
   * Autentica a un agricultor. Recibe nombre_cafetal y password.
   * Responde 200 con los datos del usuario si coinciden, o 401 si no.
   */
  async login(req, res) {
    try {
      const { nombre_cafetal, password } = req.body || {};

      if (!nombre_cafetal || !password) {
        return res.status(400).json({ mensaje: 'nombre_cafetal y password son obligatorios' });
      }

      const filas = await db.query('SELECT * FROM usuarios WHERE nombre_cafetal = ?', [nombre_cafetal.trim()]);
      const usuario = filas[0];

      // bcrypt.compare cifra la contraseña escrita y la compara con el hash guardado.
      const coincide = usuario && (await bcrypt.compare(String(password), usuario.password_hash));

      // Se responde igual si el cafetal no existe o si la clave es incorrecta,
      // para no revelar cuáles cafetales están registrados.
      if (!coincide) {
        return res.status(401).json({ mensaje: 'Cafetal o contraseña incorrectos' });
      }

      res.json({
        mensaje: 'Login exitoso',
        usuario: {
          id: usuario.id,
          nombre_agricultor: usuario.nombre_agricultor,
          nombre_cafetal: usuario.nombre_cafetal
        }
      });
    } catch (error) {
      this.manejarError(res, error);
    }
  }
}

module.exports = UsuarioController;
