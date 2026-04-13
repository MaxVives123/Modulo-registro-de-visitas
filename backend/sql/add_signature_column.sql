-- Ejecutar en Railway (Postgres → Query / psql) si no puedes redeployar aún.
-- Idempotente: seguro repetir.
ALTER TABLE visits ADD COLUMN IF NOT EXISTS signature TEXT;
