const db = require('../config/db');
const BaseController = require('./BaseController');

class RegistroController extends BaseController {
  // Valida y convierte los datos numéricos. Devuelve { error } o los valores listos.
  normalizar(body) {
    const kilosSeco = Number(body.kilos_seco);
    const kilosCereza = Number(body.kilos_cereza ?? 0);
    const precioVenta = Number(body.precio_venta);
    const egresos = Number(body.egresos ?? 0);

    if (!(kilosSeco > 0)) return { error: 'kilos_seco debe ser un número mayor a 0' };
    if (!(precioVenta > 0)) return { error: 'precio_venta debe ser un número mayor a 0' };
    if (!(kilosCereza >= 0) || !(egresos >= 0)) {
      return { error: 'kilos_cereza y egresos deben ser números iguales o mayores a 0' };
    }

    const ganancia = Math.round((kilosSeco * precioVenta - egresos) * 100) / 100;
    return { kilosSeco, kilosCereza, precioVenta, egresos, ganancia };
  }

  // GET /api/registros            → todos
  // GET /api/registros?usuario_id=1 → solo los de ese agricultor
  async listar(req, res) {
    try {
      const { usuario_id } = req.query;
      let sql = 'SELECT * FROM registros_cosecha';
      const params = [];

      if (usuario_id) {
        sql += ' WHERE usuario_id = ?';
        params.push(usuario_id);
      }
      sql += ' ORDER BY fecha DESC, id DESC';

      const registros = await db.query(sql, params);
      res.json(registros);
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  // GET /api/registros/:id
  async obtenerPorId(req, res) {
    try {
      const filas = await db.query('SELECT * FROM registros_cosecha WHERE id = ?', [req.params.id]);
      if (filas.length === 0) {
        return res.status(404).json({ mensaje: 'Registro no encontrado' });
      }
      res.json(filas[0]);
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  // POST /api/registros
  async crear(req, res) {
    try {
      const body = req.body || {};
      const usuarioId = Number(body.usuario_id);

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({ mensaje: 'usuario_id es obligatorio y debe ser un número entero' });
      }

      const datos = this.normalizar(body);
      if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
      }

      // Si no mandan fecha, MySQL usa la fecha de hoy (CURDATE())
      const resultado = await db.query(
        `INSERT INTO registros_cosecha
           (usuario_id, fecha, kilos_seco, kilos_cereza, precio_venta, egresos, ganancia)
         VALUES (?, COALESCE(?, CURDATE()), ?, ?, ?, ?, ?)`,
        [usuarioId, body.fecha || null, datos.kilosSeco, datos.kilosCereza,
         datos.precioVenta, datos.egresos, datos.ganancia]
      );

      const filas = await db.query('SELECT * FROM registros_cosecha WHERE id = ?', [resultado.insertId]);
      res.status(201).json({ mensaje: 'Registro creado correctamente', registro: filas[0] });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  // PUT /api/registros/:id
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const body = req.body || {};

      const filas = await db.query('SELECT * FROM registros_cosecha WHERE id = ?', [id]);
      if (filas.length === 0) {
        return res.status(404).json({ mensaje: 'Registro no encontrado' });
      }

      const datos = this.normalizar(body);
      if (datos.error) {
        return res.status(400).json({ mensaje: datos.error });
      }

      const fecha = body.fecha || filas[0].fecha; // si no mandan fecha, se conserva

      await db.query(
        `UPDATE registros_cosecha
            SET fecha = ?, kilos_seco = ?, kilos_cereza = ?, precio_venta = ?, egresos = ?, ganancia = ?
          WHERE id = ?`,
        [fecha, datos.kilosSeco, datos.kilosCereza, datos.precioVenta, datos.egresos, datos.ganancia, id]
      );

      const actualizado = await db.query('SELECT * FROM registros_cosecha WHERE id = ?', [id]);
      res.json({ mensaje: 'Registro actualizado correctamente', registro: actualizado[0] });
    } catch (error) {
      this.manejarError(res, error);
    }
  }

  // DELETE /api/registros/:id
  async eliminar(req, res) {
    try {
      const resultado = await db.query('DELETE FROM registros_cosecha WHERE id = ?', [req.params.id]);
      if (resultado.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Registro no encontrado' });
      }
      res.json({ mensaje: 'Registro eliminado correctamente' });
    } catch (error) {
      this.manejarError(res, error);
    }
  }
}

module.exports = RegistroController;