-- ==============================================================================
-- SCRIPT COMPLETO E DEFINITIVO DE BANCO DE DADOS - CONDOACCESS (Supabase / PostgreSQL)
-- ==============================================================================
-- Este script realiza a criação, estruturação e correção de TODAS as tabelas,
-- chaves estrangeiras, índices e políticas de Row Level Security (RLS) para o CondoAccess.
--
-- Para aplicar:
-- 1. Copie todo o conteúdo deste arquivo.
-- 2. Abra o console do seu projeto no Supabase (https://supabase.com).
-- 3. Clique em "SQL Editor" no menu lateral esquerdo.
-- 4. Clique em "New Query", cole o script e clique em "Run" (Executar).
-- ==============================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA: residents (Moradores)
CREATE TABLE IF NOT EXISTS residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL,
  phone text,
  email text,
  vehicles jsonb DEFAULT '[]'::jsonb,
  members jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'Ativo',
  avatar_url text,
  role text DEFAULT 'Morador',
  password text DEFAULT '1234',
  biometrics_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Garantir colunas essenciais na tabela 'residents' caso ela já existisse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='biometrics_active') THEN
    ALTER TABLE residents ADD COLUMN biometrics_active boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='email') THEN
    ALTER TABLE residents ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='password') THEN
    ALTER TABLE residents ADD COLUMN password text DEFAULT '1234';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='residents' AND column_name='updated_at') THEN
    ALTER TABLE residents ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. TABELA: visitors (Visitantes)
CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  type text,
  unit_to_visit text,
  resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  host_name text,
  company text,
  vehicle_plate text,
  entry_time timestamptz,
  exit_time timestamptz,
  status text DEFAULT 'Pre-Autorizado',
  exit_code text,
  notes text,
  expiration_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  validity_duration text,
  auto_released boolean DEFAULT false
);

-- Garantir colunas adicionais para a tabela 'visitors' caso ela já existisse
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='validity_duration') THEN
    ALTER TABLE visitors ADD COLUMN validity_duration text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='auto_released') THEN
    ALTER TABLE visitors ADD COLUMN auto_released boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='expiration_time') THEN
    ALTER TABLE visitors ADD COLUMN expiration_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='visitors' AND column_name='updated_at') THEN
    ALTER TABLE visitors ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 3. TABELA: common_areas (Áreas Comuns)
CREATE TABLE IF NOT EXISTS common_areas (
  id text PRIMARY KEY,
  name text NOT NULL,
  capacity int,
  description text,
  rules text,
  price decimal(10,2),
  photo_url text,
  created_at timestamptz DEFAULT now()
);

-- 4. TABELA: bookings (Reservas)
-- Nota: O ID é TEXT para suportar o formato gerado pelo aplicativo (ex: 'book-1780381287184')
CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  area_id text REFERENCES common_areas(id) ON DELETE CASCADE,
  unit text,
  resident_name text,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  date text,
  start_time text,
  end_time text,
  status text DEFAULT 'Pendente',
  guests_count int DEFAULT 0,
  guests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Corrigir tipo da coluna ID do bookings para TEXT se for necessário
DO $$
BEGIN
  ALTER TABLE bookings ALTER COLUMN id TYPE text;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Nao foi possivel alterar a coluna id do bookings para text diretamente. Sem problemas se ja for text.';
END $$;

-- 5. TABELA: announcements (Avisos)
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  date text DEFAULT now()::text,
  author text,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES residents(id) ON DELETE SET NULL,
  active boolean DEFAULT true
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='created_by') THEN
    ALTER TABLE announcements ADD COLUMN created_by uuid REFERENCES residents(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='active') THEN
    ALTER TABLE announcements ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='announcements' AND column_name='updated_at') THEN
    ALTER TABLE announcements ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 6. TABELA: incidents (Ocorrências)
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  description text,
  unit text,
  status text DEFAULT 'Aberto',
  date text DEFAULT now()::text,
  replies jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES residents(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  deleted_by text,
  deletion_reason text
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='replies') THEN
    ALTER TABLE incidents ADD COLUMN replies jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='created_by') THEN
    ALTER TABLE incidents ADD COLUMN created_by uuid REFERENCES residents(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='active') THEN
    ALTER TABLE incidents ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='deleted_at') THEN
    ALTER TABLE incidents ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='deleted_by') THEN
    ALTER TABLE incidents ADD COLUMN deleted_by text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='deletion_reason') THEN
    ALTER TABLE incidents ADD COLUMN deletion_reason text;
  END IF;
END $$;

-- 7. TABELA: encomendas (Correspondências e Pacotes)
CREATE TABLE IF NOT EXISTS encomendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rastreio text,
  morador_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  morador_nome text,
  apartamento text,
  torre text,
  data_recebimento timestamptz DEFAULT now(),
  responsavel_recebimento text,
  observacoes text,
  foto_url text,
  qr_code_value text,
  status text DEFAULT 'Pendente',
  data_retirada timestamptz,
  quem_retirou text,
  responsavel_entrega text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES residents(id) ON DELETE SET NULL,
  active boolean DEFAULT true
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomendas' AND column_name='qr_code_value') THEN
    ALTER TABLE encomendas ADD COLUMN qr_code_value text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomendas' AND column_name='created_by') THEN
    ALTER TABLE encomendas ADD COLUMN created_by uuid REFERENCES residents(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='encomendas' AND column_name='active') THEN
    ALTER TABLE encomendas ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;

-- 8. TABELA: app_config (Configurações do CondoAccess)
CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Garantir que a coluna 'value' seja do tipo JSONB se a tabela já existia com TEXT
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_name='app_config' AND column_name='value') = 'text' THEN
    -- Reseta se for texto antigo irreconciliável para evitar erros de casting complexos
    DROP TABLE app_config CASCADE;
    CREATE TABLE app_config (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text UNIQUE NOT NULL,
      value jsonb NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- 9. TABELA: login_customization (Personalização do Login)
CREATE TABLE IF NOT EXISTS login_customization (
  id text PRIMARY KEY DEFAULT 'active',
  layout_model int DEFAULT 4,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#1e293b',
  button_color text DEFAULT '#2563eb',
  button_text_color text DEFAULT '#ffffff',
  text_color text DEFAULT '#fafafa',
  logo_url text,
  logo_size int DEFAULT 100,
  logo_alignment text DEFAULT 'center',
  background_url text,
  background_opacity int DEFAULT 100,
  background_blur int DEFAULT 0,
  condominium_name text DEFAULT 'CondoAccess',
  slogan text DEFAULT 'Mural Central & Controle de Acesso',
  welcome_message text DEFAULT 'Painel Central do Condomínio Inteligente',
  footer_text text DEFAULT 'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA',
  updated_at timestamptz DEFAULT now(),
  updated_by text
);

-- 10. TABELA: theme_settings (Configurações de Tema)
CREATE TABLE IF NOT EXISTS theme_settings (
  id text PRIMARY KEY DEFAULT 'active',
  app_name text DEFAULT 'CONDOACCESS',
  app_slogan text DEFAULT 'Mural Central & Controle de Acesso',
  logo_url text,
  logo_icon text DEFAULT 'Building2',
  preset_id text DEFAULT 'classic',
  custom_bg text DEFAULT '#f8fafc',
  custom_card_bg text DEFAULT '#ffffff',
  custom_text text DEFAULT '#0f172a',
  custom_text_muted text DEFAULT '#475569',
  custom_border text DEFAULT '#cbd5e1',
  custom_accent text DEFAULT '#2563eb',
  tower_names jsonb DEFAULT '["Torre 1", "Torre 2", "Torre 3"]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 11. TABELA: achados_perdidos (Achados e Perdidos)
CREATE TABLE IF NOT EXISTS achados_perdidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  descricao text,
  local_encontrado text,
  data_encontrado timestamptz DEFAULT now(),
  status text DEFAULT 'Encontrado',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES residents(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  
  -- Controle de Retirada & Solicitação de Devolução
  proprietario_nome text,
  proprietario_unidade text,
  data_retirada timestamptz,
  responsavel_entrega text,
  assinatura_digital text,         -- Base64 signature
  foto_entrega text,               -- Base64 proof photo
  comprovacao_posse text,          -- Justificativa
  documento_comprovatorio text,    -- Base64 doc
  solicitante_id text,
  solicitante_nome text,
  solicitante_unidade text,
  solicitado_em timestamptz,
  
  -- Soft Delete Audit
  deleted_at timestamptz,
  deleted_by text,
  deletion_reason text
);

-- 12. TABELA: achados_perdidos_fotos (Múltiplas Fotos de Achados/Perdidos)
CREATE TABLE IF NOT EXISTS achados_perdidos_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id uuid REFERENCES achados_perdidos(id) ON DELETE CASCADE,
  url_foto text NOT NULL, -- Base64 completo
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES residents(id) ON DELETE SET NULL,
  active boolean DEFAULT true
);

-- 13. TABELA: achados_perdidos_historico (Histórico de Eventos de Achados e Perdidos)
CREATE TABLE IF NOT EXISTS achados_perdidos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id uuid REFERENCES achados_perdidos(id) ON DELETE CASCADE,
  usuario_id text,
  usuario_nome text,
  acao text NOT NULL,  -- Cadastro | Alteração | Inclusão de fotos etc.
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES residents(id) ON DELETE SET NULL,
  active boolean DEFAULT true
);

-- 14. TABELA: audit_logs (Auditoria Geral e Rastreamento)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  user_id text,
  user_name text,
  action text NOT NULL,
  module text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  error_message text,
  stack_trace text,
  restored_by text,
  restored_at timestamptz
);


-- ==============================================================================
-- 15. COLECÃO DE ÍNDICES DE PERFORMANCE (Otimizações essenciais)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_residents_unit ON residents(unit);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_encomendas_status ON encomendas(status);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_status ON achados_perdidos(status);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_fotos_objeto ON achados_perdidos_fotos(objeto_id);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_hist_objeto ON achados_perdidos_historico(objeto_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);


-- ==============================================================================
-- 16. CONFIGURAÇÃO DE POLÍTICAS DE ROW LEVEL SECURITY (RLS) UNIVERSAIS
-- ==============================================================================
-- Ativa e garante acesso irrestrito de sincronização offline e persistência.

ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE encomendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_customization ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE achados_perdidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE achados_perdidos_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE achados_perdidos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper dinâmico para remover políticas anteriores e consolidar políticas permissivas
CREATE OR REPLACE FUNCTION apply_universal_policy(tbl text) RETURNS void AS $$
BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all authenticated access" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Allow all anonymous access" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Allow all anon access" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Enable read access for all users" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Permissive all for ' || tbl || '" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Only administrators can view audit logs" ON ' || tbl;
    EXECUTE 'DROP POLICY IF EXISTS "Everyone can write audit logs" ON ' || tbl;
    
    EXECUTE 'CREATE POLICY "Allow all authenticated and anon access" ON ' || tbl || ' FOR ALL USING (true) WITH CHECK (true)';
END;
$$ LANGUAGE plpgsql;

-- Executar helper em cada tabela do ecossistema CondoAccess
SELECT apply_universal_policy('residents');
SELECT apply_universal_policy('visitors');
SELECT apply_universal_policy('common_areas');
SELECT apply_universal_policy('bookings');
SELECT apply_universal_policy('announcements');
SELECT apply_universal_policy('incidents');
SELECT apply_universal_policy('encomendas');
SELECT apply_universal_policy('app_config');
SELECT apply_universal_policy('login_customization');
SELECT apply_universal_policy('theme_settings');
SELECT apply_universal_policy('achados_perdidos');
SELECT apply_universal_policy('achados_perdidos_fotos');
SELECT apply_universal_policy('achados_perdidos_historico');
SELECT apply_universal_policy('audit_logs');

DROP FUNCTION apply_universal_policy(text);


-- ==============================================================================
-- 17. CARGA DE CONFIGURAÇÕES INICIAIS (Seeds)
-- ==============================================================================

-- Inserir dados padrão de configuração do CondoAccess
INSERT INTO app_config (key, value)
VALUES 
  ('admin_password', '"admin"'),
  ('theme_settings', '{"appName": "CONDOACCESS", "appSlogan": "Mural Central & Controle de Acesso", "logoUrl": "", "logoIcon": "Building2", "presetId": "classic", "customBg": "#f8fafc", "customCardBg": "#ffffff", "customText": "#0f172a", "customTextMuted": "#475569", "customBorder": "#cbd5e1", "customAccent": "#2563eb", "towerNames": ["Torre 1", "Torre 2", "Torre 3"]}'),
  ('operator_settings', '{"operatorName": "Op. Ricardo Silva", "portName": "Portaria Norte", "operatorAvatarUrl": ""}')
ON CONFLICT (key) DO NOTHING;

-- Inserir dados padrão de personalização de login
INSERT INTO login_customization (id, layout_model, primary_color, secondary_color, button_color, button_text_color, text_color, condominium_name, slogan, welcome_message, footer_text, updated_at, updated_by)
VALUES (
  'active', 
  4, 
  '#3b82f6', 
  '#1e293b', 
  '#2563eb', 
  '#ffffff', 
  '#fafafa', 
  'CondoAccess', 
  'Mural Central & Controle de Acesso', 
  'Painel Central do Condomínio Inteligente', 
  'Local Console Security Client v2.4 • Desenvolvido com Tecnologia IA', 
  now(), 
  'Administrador'
)
ON CONFLICT (id) DO NOTHING;

-- Inserir dados padrão de configurações de tema
INSERT INTO theme_settings (id, app_name, app_slogan, logo_icon, preset_id, custom_bg, custom_card_bg, custom_text, custom_text_muted, custom_border, custom_accent, tower_names)
VALUES (
  'active',
  'CONDOACCESS',
  'Mural Central & Controle de Acesso',
  'Building2',
  'classic',
  '#f8fafc',
  '#ffffff',
  '#0f172a',
  '#475569',
  '#cbd5e1',
  '#2563eb',
  '["Torre 1", "Torre 2", "Torre 3"]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Inserir algumas áreas comuns padrão caso não existam
INSERT INTO common_areas (id, name, capacity, description, rules, price, photo_url)
VALUES 
  ('area-play', 'Salão de Festas', 80, 'Salão de festas decorado e equipado com mesas, cadeiras e freezer.', 'Devolução do espaço limpo. Horário máximo até as 22h.', 150.00, ''),
  ('area-churras', 'Churrasqueira Gourmet', 30, 'Espaço com churrasqueira a carvão, grelha, freezer e lavabo individual.', 'Proibido som alto após as 22:00h.', 80.00, ''),
  ('area-quadra', 'Quadra Poliesportiva', 15, 'Quadra para futebol, basquete e volei.', 'Uso limite de 1 hora por morador caso haja fila.', 0.00, ''),
  ('area-piscina', 'Piscina & Solário', 40, 'Piscina adulto e infantil com cadeiras de sol e mesas.', 'Proibido recipientes de vidro. Obrigatório exame médico.', 0.00, '')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- FIM DO SCRIPT DE INSTALAÇÃO DO BANCO DE DADOS
-- ==============================================================================
