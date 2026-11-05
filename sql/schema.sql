-- =====================================================================
-- sql/schema.sql — Estructura de la base de datos de CaféPro
-- Ejecútalo una sola vez en MySQL (Workbench o terminal) para crear la
-- base de datos y sus dos tablas. Es seguro ejecutarlo de nuevo: usa
-- "IF NOT EXISTS" y no borra datos existentes.
-- =====================================================================

-- 1. Crear la base de datos.
--    utf8mb4 permite guardar tildes, la ñ y emojis sin problemas.
CREATE DATABASE IF NOT EXISTS cafepro_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Indicar que las siguientes instrucciones trabajan dentro de esa base de datos.
USE cafepro_db;

-- 3. Tabla de usuarios (agricultores).
CREATE TABLE IF NOT EXISTS usuarios (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- identificador; MySQL lo asigna solo (1, 2, 3...)
  nombre_agricultor VARCHAR(100) NOT NULL,                   -- nombre de la persona
  nombre_cafetal    VARCHAR(100) NOT NULL UNIQUE,            -- nombre de la finca; único porque se usa para iniciar sesión
  password_hash     VARCHAR(255) NOT NULL,                   -- contraseña cifrada con bcrypt (nunca en texto plano)
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP      -- fecha y hora de creación
);

-- 4. Tabla de registros de cosecha (pases). Cada registro pertenece a un usuario.
CREATE TABLE IF NOT EXISTS registros_cosecha (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,                       -- a qué agricultor pertenece el registro
  fecha         DATE NOT NULL,                               -- fecha del pase de cosecha
  kilos_seco    DECIMAL(10,2) NOT NULL,                      -- kilos de café pergamino seco
  kilos_cereza  DECIMAL(10,2) NOT NULL DEFAULT 0,            -- kilos de café cereza (opcional)
  precio_venta  DECIMAL(14,2) NOT NULL,                      -- precio de venta POR KILO, en pesos
  egresos       DECIMAL(14,2) NOT NULL DEFAULT 0,            -- gastos de producción, en pesos
  ganancia      DECIMAL(14,2) NOT NULL,                      -- kilos_seco x precio_venta - egresos (la calcula el servidor)
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Llave foránea: relaciona cada registro con un usuario existente.
  -- ON DELETE CASCADE: si se borra el usuario, se borran también sus registros.
  CONSTRAINT fk_registro_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);
