-- Script para adicionar a coluna ausente na tabela 'incidents'
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS replies JSONB DEFAULT '[]'::jsonb;
