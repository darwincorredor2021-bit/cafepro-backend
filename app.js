require('dotenv').config(); // SIEMPRE primero: carga las variables del .env

const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const usuariosRoutes = require('./routes/usuarios.routes');
const registrosRoutes = require('./routes/registros.routes');
const precioRoutes = require('./routes/precio.routes');

class Servidor {
  constructor() {
    this.app = express();
    this.puerto = process.env.PORT || 3000;
    this.configurarMiddlewares();
    this.configurarRutas();
    this.configurarErrores();
  }

  // Middlewares: funciones que se ejecutan en CADA petición antes de llegar a las rutas
  configurarMiddlewares() {
    this.app.use(cors());          // permite peticiones desde tu frontend
    this.app.use(express.json());  // convierte el JSON del Body en req.body
  }

  configurarRutas() {
    this.app.get('/', (req, res) => {
      res.json({ mensaje: 'API de CaféPro funcionando ☕' });
    });
    this.app.use('/api/usuarios', usuariosRoutes);
    this.app.use('/api/registros', registrosRoutes);
    this.app.use('/api/precio', precioRoutes);

    // Si ninguna ruta coincidió, respondemos 404
    this.app.use((req, res) => {
      res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
    });
  }

  // Captura errores generales (por ejemplo, un JSON mal escrito en el Body)
  configurarErrores() {
    this.app.use((err, req, res, next) => {
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El JSON enviado tiene un error de sintaxis' });
      }
      console.error(err);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    });
  }

  async iniciar() {
    try {
      await db.probarConexion(); // si MySQL no responde, ni siquiera arrancamos
      console.log('✅ Conectado a MySQL');
      this.app.listen(this.puerto, () => {
        console.log(`🚀 Servidor corriendo en http://localhost:${this.puerto}`);
      });
    } catch (error) {
      console.error('❌ No se pudo conectar a MySQL:', error.message);
      process.exit(1);
    }
  }
}

new Servidor().iniciar();