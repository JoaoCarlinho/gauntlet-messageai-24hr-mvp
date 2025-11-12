-- Drop all tables in the public schema
-- Run this in Railway Shell: railway run psql -f scripts/drop-all-tables.sql

DO $$ DECLARE
    r RECORD;
BEGIN
    -- Drop all tables
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Verify all tables are gone
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
