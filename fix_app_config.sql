-- 0. Garantir a tabela app_config existe
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 1. Habilitar RLS se não estiver habilitado
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- 2. Limpar e criar política de leitura permissiva (RLS)
DROP POLICY IF EXISTS "Allow all authenticated access" ON app_config;
CREATE POLICY "Allow all authenticated access" ON app_config FOR ALL USING (true);

-- 3. Adicionar entradas padrão se não existirem
INSERT INTO app_config (key, value)
VALUES 
  ('admin_password', '"admin"'),
  ('theme_settings', '{"appName": "CONDOACCESS", "appSlogan": "Mural Central & Controle de Acesso", "logoUrl": "", "logoIcon": "Building2", "presetId": "classic", "customBg": "#f8fafc", "customCardBg": "#ffffff", "customText": "#0f172a", "customTextMuted": "#475569", "customBorder": "#cbd5e1", "customAccent": "#2563eb", "towerNames": ["Torre 1", "Torre 2", "Torre 3"]}'),
  ('operator_settings', '{"operatorName": "Op. Ricardo Silva", "portName": "Portaria Norte", "operatorAvatarUrl": ""}')
ON CONFLICT (key) DO NOTHING;
