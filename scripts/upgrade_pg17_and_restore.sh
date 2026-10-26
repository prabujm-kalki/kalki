#!/bin/bash
set -e

echo "=== Adding PostgreSQL official repository for PG 17 ==="
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt noble-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
sudo apt-get update -y
sudo apt-get install -y postgresql-17 postgresql-client-17

echo "=== Recreating kalki user & kalki_bos db in PG 17 ==="
sudo -u postgres psql -p 5432 << 'SQL' || sudo -u postgres psql << 'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'kalki') THEN
    CREATE USER kalki WITH PASSWORD '795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be' SUPERUSER CREATEDB;
  ELSE
    ALTER USER kalki WITH PASSWORD '795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be';
  END IF;
END
$$;
DROP DATABASE IF EXISTS kalki_bos;
CREATE DATABASE kalki_bos OWNER kalki;
GRANT ALL PRIVILEGES ON DATABASE kalki_bos TO kalki;
SQL

echo "=== Restoring Dump with pg_restore 17 ==="
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be pg_restore -h localhost -U kalki -d kalki_bos /home/ubuntu/db-backup.sql || true

echo "=== Database Verification ==="
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be psql -h localhost -U kalki -d kalki_bos -c "SELECT count(*) AS total_items FROM items;"
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be psql -h localhost -U kalki -d kalki_bos -c "SELECT count(*) AS total_invoices FROM b2b_sales_invoices;"
