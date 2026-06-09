-- Fix RLS Policies for all tables to allow authenticated/anon access
-- This makes the database public as requested for this app context.

-- Tables to fix: residents, visitors, incidents, common_areas, bookings, announcements, assemblies, votes, encomendas, app_config

-- Helper function to apply permissive policy
CREATE OR REPLACE FUNCTION apply_permissive_policy(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all authenticated access" ON ' || table_name;
    EXECUTE 'DROP POLICY IF EXISTS "Allow all anon access" ON ' || table_name;
    EXECUTE 'CREATE POLICY "Allow all authenticated and anon access" ON ' || table_name || ' FOR ALL USING (true) WITH CHECK (true)';
END;
$$ LANGUAGE plpgsql;

-- Apply for all tables
SELECT apply_permissive_policy('residents');
SELECT apply_permissive_policy('visitors');
SELECT apply_permissive_policy('incidents');
SELECT apply_permissive_policy('common_areas');
SELECT apply_permissive_policy('bookings');
SELECT apply_permissive_policy('announcements');
SELECT apply_permissive_policy('assemblies');
SELECT apply_permissive_policy('votes');
SELECT apply_permissive_policy('encomendas');
SELECT apply_permissive_policy('app_config');

-- Drop helper function
DROP FUNCTION apply_permissive_policy(text);
