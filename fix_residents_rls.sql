-- Corrigir e garantir políticas de RLS para a tabela residents
-- Permite leitura, inserção, atualização e deleção para qualquer usuário autenticado (ou anon, dependendo da configuração da sua API, mas com USING true garante sucesso se o banco permitir).

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all authenticated access" ON residents;
CREATE POLICY "Allow all authenticated access" ON residents FOR ALL USING (true) WITH CHECK (true);
