-- Remover todas as políticas existentes para residents para garantir um estado limpo
DROP POLICY IF EXISTS "Allow all authenticated access" ON residents;
DROP POLICY IF EXISTS "Enable read access for all users" ON residents;
DROP POLICY IF EXISTS "Enable insert access for all authenticated users" ON residents;
DROP POLICY IF EXISTS "Enable update access for all authenticated users" ON residents;
DROP POLICY IF EXISTS "Enable delete access for all authenticated users" ON residents;

-- Garantir que a RLS está ativa
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

-- Criar políticas permissivas para autenticados
CREATE POLICY "Allow all authenticated access" ON residents 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Criar políticas para anon se necessário (muitas vezes necessário em apps sem autenticação complexa usando anon_key)
CREATE POLICY "Allow all anonymous access" ON residents 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);
