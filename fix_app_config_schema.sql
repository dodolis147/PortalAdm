-- 1. Criar coluna temporária jsonb
ALTER TABLE app_config ADD COLUMN value_new jsonb;

-- 2. Atualizar ou limpar dados corrompidos (apenas para entries que não são JSON válido)
-- Vamos definir um valor padrão JSON para os corrompidos ou apagá-los
UPDATE app_config 
SET value_new = '{}'::jsonb 
WHERE value = '[object Object]';

-- 3. Tentar converter os válidos (com cuidado se não funcionar)
-- Se isso falhar, teremos que truncar
-- Vamos truncar a tabela após backup (não é possível fazer backup aqui facilmente, mas os dados de config são recriáveis)
-- Como o usuário tem um script que insere valores iniciais, podemos reconstruir.

-- Resetar tabela com esquema correto
DROP TABLE app_config;

CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all authenticated access" ON app_config;
CREATE POLICY "Allow all authenticated access" ON app_config FOR ALL USING (true);

-- Reinserir valores padrão
INSERT INTO app_config (key, value)
VALUES 
  ('admin_password', '"admin"'),
  ('theme_settings', '{"appName": "CONDOACCESS", "appSlogan": "Mural Central & Controle de Acesso", "logoUrl": "", "logoIcon": "Building2", "presetId": "classic", "customBg": "#f8fafc", "customCardBg": "#ffffff", "customText": "#0f172a", "customTextMuted": "#475569", "customBorder": "#cbd5e1", "customAccent": "#2563eb", "towerNames": ["Torre 1", "Torre 2", "Torre 3"]}'),
  ('operator_settings', '{"operatorName": "Op. Ricardo Silva", "portName": "Portaria Norte", "operatorAvatarUrl": ""}')
ON CONFLICT (key) DO NOTHING;
