const mysql = require('mysql2/promise');

// Las bases de datos en la nube (Aiven) EXIGEN conexión cifrada (SSL).
// En tu computador local no hace falta, por eso se activa solo si DB_SSL=true.
function configurarSSL() {
  if (process.env.DB_SSL !== 'true') return undefined;

  // Opción recomendada: si pegas el certificado de Aiven en DB_CA, se verifica el servidor
  if (process.env.DB_CA) {
    return { ca: process.env.DB_CA };
  }
  // Opción simple: conexión cifrada sin verificar el certificado
  return { rejectUnauthorized: false };
}

// Clase que se encarga ÚNICAMENTE de hablar con MySQL
class Database {
  constructor() {
    // Un "pool" es un grupo de conexiones listas para usar.
    this.pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'cafepro_db',
      ssl: configurarSSL(),
      waitForConnections: true,
      connectionLimit: 10,
      connectTimeout: 20000, // la nube puede tardar más que tu PC
      decimalNumbers: true,  // DECIMAL llega como número (no como texto "125.00")
      dateStrings: true      // DATE llega como "2026-11-01"
    });
  }

  // Ejecuta una consulta SQL con parámetros (los "?" evitan la inyección SQL)
  async query(sql, params = []) {
    const [resultado] = await this.pool.execute(sql, params);
    return resultado;
  }

  // Se usa al arrancar para confirmar que MySQL responde
  async probarConexion() {
    const conexion = await this.pool.getConnection();
    conexion.release();
  }
}

// Exportamos UNA sola instancia, así toda la app comparte el mismo pool
module.exports = new Database();
