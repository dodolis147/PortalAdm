-- Adiciona colunas que podem estar faltando em tabelas existentes
-- O Supabase não atualiza colunas apenas com CREATE TABLE IF NOT EXISTS

DO $$
BEGIN
  -- residents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='biometrics_active') THEN
    ALTER TABLE residents ADD COLUMN biometrics_active boolean DEFAULT false;
  END IF;
  
  -- Garante que email exista
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='email') THEN
    ALTER TABLE residents ADD COLUMN email text;
  END IF;

  -- Verifica updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='updated_at') THEN
    ALTER TABLE residents ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
  
  -- visitors
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='validity_duration') THEN
    ALTER TABLE visitors ADD COLUMN validity_duration text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='auto_released') THEN
    ALTER TABLE visitors ADD COLUMN auto_released boolean DEFAULT false;
  END IF;

  -- incidents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='replies') THEN
    ALTER TABLE incidents ADD COLUMN replies jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
