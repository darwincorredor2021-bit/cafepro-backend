class BaseController {
  // Traduce errores técnicos de MySQL a respuestas entendibles
  manejarError(res, error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        mensaje: 'Ya existe un registro con ese valor único (por ejemplo, ese cafetal ya está registrado)'
      });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ mensaje: 'El usuario indicado no existe' });
    }
    if (error.code === 'ER_TRUNCATED_WRONG_VALUE') {
      return res.status(400).json({ mensaje: 'Fecha inválida. Usa el formato AAAA-MM-DD' });
    }
    console.error('Error:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
}

module.exports = BaseController;