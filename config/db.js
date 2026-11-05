// =====================================================================
// config/db.js — Conexión a la base de datos MySQL
// Este archivo crea UNA sola conexión compartida (un "pool") que usan
// todos los controladores para ejecutar consultas SQL.
// =====================================================================

const mysql = require('mysql2/promise');

/**
 * Decide si la conexión a MySQL debe ir cifrada (SSL).
 * - En tu computador no hace falta, por eso queda desactivado.
 * - Las bases de datos en la nube (como Aiven) la exigen: se activa
 *   poniendo DB_SSL=true en las variables de entorno.
 *
 * @returns {object|undefined} Configuración SSL para mysql2, o undefined si no se usa.
 */
function configurarSSL() {
  if (process.env.DB_SSL !== 'true') return undefined;

  // Opción recomendada: con el certificado del proveedor en DB_CA se verifica
  // que realmente nos conectamos a su servidor.
  if (process.env.DB_CA) {
    return { ca: process.env.DB_CA };
  }

  // Opción simple: la conexión va cifrada, pero sin verificar el certificado.
  return { rejectUnauthorized: false };
}

/**
 * Clase que se encarga ÚNICAMENTE de hablar con MySQL.
 * El resto de la aplicación nunca se conecta directamente: le pide
 * a esta clase que ejecute las consultas.
 */
class Database {
  constructor() {
    // Un "pool" es un grupo de conexiones abiertas y listas para usarse.
    // Es más rápido que abrir y cerrar una conexión en cada petición.
    // Los datos de acceso se leen del archivo .env (nunca se escriben en el código).
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cafepro_db',
      ssl: configurarSSL(),
      waitForConnections: true, // si todas las conexiones están ocupadas, espera turno
      connectionLimit: 10,      // máximo de conexiones simultáneas
      connectTimeout: 20000,    // la nube puede tardar más que un MySQL local (20 s)
      decimalNumbers: true,     // los DECIMAL llegan como número y no como texto ("125.00")
      dateStrings: true         // los DATE llegan como texto "2026-11-01", sin cambios de zona horaria
    });
  }

  /**
   * Ejecuta una consulta SQL de forma segura.
   * Los signos "?" del SQL se reemplazan por los valores de `params`; así el
   * dato siempre se trata como dato y nunca como código (evita la inyección SQL).
   *
   * @param {string} sql     Consulta con "?" donde van los valores.
   * @param {Array}  params  Valores que reemplazan a cada "?", en orden.
   * @returns {Promise<Array|object>} Filas (SELECT) o resumen de la operación (INSERT/UPDATE/DELETE).
   */
  async query(sql, params = []) {
    const [resultado] = await this.pool.execute(sql, params);
    return resultado;
  }

  /**
   * Comprueba que MySQL responde. Se usa al arrancar el servidor:
   * si falla, lanza un error y el servidor no se inicia.
   */
  async probarConexion() {
    const conexion = await this.pool.getConnection();
    conexion.release(); // devuelve la conexión al pool
  }
}

// Se exporta UNA sola instancia: toda la aplicación comparte el mismo pool.
module.exports = new Database();
