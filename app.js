// =====================================================================
// app.js — Punto de entrada del backend de CaféPro
// Crea el servidor Express, activa sus configuraciones, conecta las rutas
// de la API y lo deja escuchando peticiones (por defecto en el puerto 3000).
// Para iniciarlo: npm start   (o npm run dev mientras desarrollas)
// =====================================================================

// Debe ir PRIMERO: carga las variables del archivo .env (claves y datos de
// la base de datos) para que el resto del código pueda leerlas.
// quiet: true evita que dotenv imprima un mensaje informativo en cada arranque.
require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const usuariosRoutes = require('./routes/usuarios.routes');
const registrosRoutes = require('./routes/registros.routes');
const precioRoutes = require('./routes/precio.routes');
const noticiasRoutes = require('./routes/noticias.routes');

/**
 * Clase que representa el servidor. Separa la configuración en métodos
 * pequeños para que cada paso sea fácil de leer.
 */
class Servidor {
  constructor() {
    this.app = express();
    // En la nube (Render) el puerto lo asigna la plataforma; en tu PC se usa el 3000.
    this.puerto = process.env.PORT || 3000;
    this.configurarMiddlewares();
    this.configurarRutas();
    this.configurarErrores();
  }

  /**
   * Middlewares: funciones que se ejecutan en CADA petición antes de llegar a las rutas.
   */
  configurarMiddlewares() {
    // Permite que el frontend (alojado en otro dominio) pueda llamar a esta API.
    this.app.use(cors());
    // Convierte el JSON que llega en el cuerpo de la petición en el objeto req.body.
    this.app.use(express.json());
  }

  /**
   * Conecta cada grupo de rutas con su dirección base.
   */
  configurarRutas() {
    // Ruta de prueba: sirve para comprobar que el servidor está encendido.
    this.app.get('/', (req, res) => {
      res.json({ mensaje: 'API de CaféPro funcionando ☕' });
    });

    this.app.use('/api/usuarios', usuariosRoutes);   // usuarios y login
    this.app.use('/api/registros', registrosRoutes); // registros de cosecha
    this.app.use('/api/precio', precioRoutes);       // precio estimado del café
    this.app.use('/api/noticias', noticiasRoutes);   // noticias del sector

    // Si ninguna ruta coincidió con la petición, se responde 404.
    // Debe ir DESPUÉS de todas las rutas.
    this.app.use((req, res) => {
      res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
    });
  }

  /**
   * Captura los errores generales que no manejó ninguna ruta
   * (por ejemplo, un JSON mal escrito en el cuerpo de la petición).
   */
  configurarErrores() {
    // Express reconoce un manejador de errores porque recibe 4 parámetros.
    this.app.use((err, req, res, next) => {
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El JSON enviado tiene un error de sintaxis' });
      }
      console.error(err);
      res.status(500).json({ mensaje: 'Error interno del servidor' });
    });
  }

  /**
   * Arranca el servidor. Antes comprueba que MySQL responda: si no hay
   * base de datos, no tiene sentido iniciar la API y el proceso termina.
   */
  async iniciar() {
    try {
      await db.probarConexion();
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
