#!/bin/bash
set -e

echo "=== Configuring PostgreSQL ==="
sudo -u postgres psql << 'SQL'
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

echo "=== Restoring Database Dump ==="
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be psql -h localhost -U kalki -d kalki_bos -f /home/ubuntu/db-backup.sql > /home/ubuntu/restore.log 2>&1 || true

echo "=== Verifying Counts ==="
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be psql -h localhost -U kalki -d kalki_bos -c "SELECT count(*) AS items FROM items;"
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be psql -h localhost -U kalki -d kalki_bos -c "SELECT count(*) AS invoices FROM b2b_sales_invoices;"
PGPASSWORD=795c40577cd5fa796b0431f75f59223118a6858f34810c7a5a4a383a3e0cf9be psql -h localhost -U kalki -d kalki_bos -c "SELECT count(*) AS pos FROM purchase_orders;"
