-- 1. Crear la base de datos (utf8mb4 permite tildes, ñ y emojis)
CREATE DATABASE IF NOT EXISTS cafepro_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. Decirle a MySQL que trabaje dentro de esa base de datos
USE cafepro_db;

-- 3. Tabla de usuarios (agricultores)
CREATE TABLE IF NOT EXISTS usuarios (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre_agricultor VARCHAR(100) NOT NULL,
  nombre_cafetal    VARCHAR(100) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla de registros de cosecha (pases), relacionada con usuarios
CREATE TABLE IF NOT EXISTS registros_cosecha (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT UNSIGNED NOT NULL,
  fecha         DATE NOT NULL,
  kilos_seco    DECIMAL(10,2) NOT NULL,
  kilos_cereza  DECIMAL(10,2) NOT NULL DEFAULT 0,
  precio_venta  DECIMAL(14,2) NOT NULL,
  egresos       DECIMAL(14,2) NOT NULL DEFAULT 0,
  ganancia      DECIMAL(14,2) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_registro_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);