-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Las tablas se crean automáticamente a través de Sequelize ORM
-- Este archivo sirve para configuraciones adicionales de PostgreSQL

-- Configuración de locale para soporte de caracteres especiales
SET client_encoding = 'UTF8';
