-- Script para adicionar as colunas ausentes na tabela 'visitors'
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS expiration_time timestamptz;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS validity_duration TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS auto_released BOOLEAN DEFAULT FALSE;
