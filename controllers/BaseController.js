// =====================================================================
// controllers/BaseController.js — Clase padre de los controladores
// Reúne lo que todos los controladores necesitan: traducir los errores
// técnicos en respuestas HTTP claras. Los demás controladores la HEREDAN
// con "extends", así no repiten este código.
// =====================================================================

class BaseController {
  /**
   * Convierte un error (de MySQL o inesperado) en una respuesta HTTP.
   *
   * @param {object} res    Respuesta de Express, para contestarle al cliente.
   * @param {Error}  error  Error capturado en un bloque try/catch.
   */
  manejarError(res, error) {
    // 409 Conflict: se intentó guardar un valor que debe ser único y ya existe
    // (por ejemplo, dos cafetales con el mismo nombre).
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe un registro con ese valor único (por ejemplo, ese cafetal ya está registrado)'
      });
    }

    // 400 Bad Request: el registro apunta a un usuario que no existe (llave foránea inválida).
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'El usuario indicado no existe' });
    }

    // 400 Bad Request: la fecha enviada no tiene un formato que MySQL entienda.
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
      return res.status(400).json({ mensaje: 'Fecha inválida. Usa el formato AAAA-MM-DD' });
    }

    // Cualquier otro error es inesperado: se deja registro en la consola del
    // servidor y al cliente solo se le informa un mensaje genérico (500).
    console.error('Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
}

module.exports = BaseController;
