const bcrypt = require('bcryptjs');
const db = require('../config/db');
const BaseController = require('./BaseController');

class UsuarioController extends BaseController {
  constructor() {
    super(); // obligatorio al heredar: ejecuta el constructor del padre
    this.saltRounds = 10; // "fuerza" del cifrado de contraseñas
  }

  // GET /api/usuarios  → lista todos (NUNCA devolvemos el password_hash)
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

  // GET /api/usuarios/:id  → un usuario
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

  // POST /api/usuarios  → crear usuario
  async crear(req, res) {
    try {
      const { nombre_agricultor, nombre_cafetal, password } = req.body || {};

      if (!nombre_agricultor || !nombre_cafetal || !password) {
        return res.status(400).json({
          mensaje: 'Faltan campos: nombre_agricultor, nombre_cafetal y password son obligatorios'
        });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ mensaje: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const passwordHash = await bcrypt.hash(String(password), this.saltRounds);

      const resultado = await db.query(
        'INSERT INTO usuarios (nombre_agricultor, nombre_cafetal, password_hash) VALUES (?, ?, ?)',
        [nombre_agricultor.trim(), nombre_cafetal.trim(), passwordHash]
      );

      res.status(201).json({
        mensaje: 'Usuario creado correctamente',
        usuario: {
          id: resultado.insertId,
          nombre_agricultor: nombre_agricultor.trim(),
          nombre_cafetal: nombre_cafetal.trim()
        }
      });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  // PUT /api/usuarios/:id  → actualizar (la contraseña es opcional)
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre_agricultor, nombre_cafetal, password } = req.body || {};

      const filas = await db.query('SELECT * FROM usuarios WHERE id = ?', [id]);
      if (filas.length === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      const actual = filas[0];

      // Si no mandan un dato, se conserva el que ya había
      const nuevoAgricultor = (nombre_agricultor || actual.nombre_agricultor).trim();
      const nuevoCafetal = (nombre_cafetal || actual.nombre_cafetal).trim();
      let nuevoHash = actual.password_hash;

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

  // DELETE /api/usuarios/:id  → eliminar (borra también sus registros por el CASCADE)
  async eliminar(req, res) {
    try {
      const resultado = await db.query('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
      }
      res.json({ mensaje: 'Usuario eliminado correctamente' });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  // POST /api/usuarios/login  → autenticación
  async login(req, res) {
    try {
      const { nombre_cafetal, password } = req.body || {};

      if (!nombre_cafetal || !password) {
        return res.status(400).json({ mensaje: 'nombre_cafetal y password son obligatorios' });
      }

      const filas = await db.query('SELECT * FROM usuarios WHERE nombre_cafetal = ?', [nombre_cafetal.trim()]);
      const usuario = filas[0];

      // bcrypt.compare compara la contraseña escrita contra el hash guardado
      const coincide = usuario && (await bcrypt.compare(String(password), usuario.password_hash));

      // Mismo mensaje en ambos casos, para no revelar si el cafetal existe
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