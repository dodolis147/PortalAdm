-- Adiciona a coluna photo_urls na tabela incidents para persistir as fotos enviadas
ALTER TABLE IF EXISTS incidents
ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '[]'::jsonb;

-- Atualiza a função de histórico (se existir alguma menção) ou apenas atua como log
COMMENT ON COLUMN incidents.photo_urls IS 'Armazena as URLs das fotos e evidências anexadas às ocorrências';
