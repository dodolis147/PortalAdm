-- SQL Script para Reconfiguração do Banco de Dados Supabase (PostgreSQL)

-- 1. Criação das Tabelas e Schema, garantindo snake_case e tipos corretos

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
  biometrics_active boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  type text,
  unit_to_visit text,
  resident_id uuid REFERENCES residents(id),
  host_name text,
  company text,
  vehicle_plate text,
  entry_time timestamptz,
  exit_time timestamptz,
  status text DEFAULT 'Pre-Autorizado',
  exit_code text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS common_areas (
  id text PRIMARY KEY,
  name text NOT NULL,
  capacity int,
  description text,
  rules text,
  price decimal(10,2),
  photo_url text
);

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id text REFERENCES common_areas(id),
  unit text,
  resident_name text,
  resident_id uuid REFERENCES residents(id),
  date text,
  start_time text,
  end_time text,
  status text DEFAULT 'Pendente',
  guests_count int DEFAULT 0,
  guests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  date text DEFAULT now()::text,
  author text,
  attachment_url text
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  description text,
  unit text,
  status text DEFAULT 'Aberto',
  date text DEFAULT now()::text,
  replies jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS assemblies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  is_open boolean DEFAULT true
);

-- Candidatos inseridos como tabela separada por boa prática de modelagem
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid REFERENCES assemblies(id) ON DELETE CASCADE,
  name text NOT NULL,
  number text,
  age int,
  proposals text,
  photo_url text,
  chapa text
);

CREATE TABLE IF NOT EXISTS votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assembly_id uuid REFERENCES assemblies(id) ON DELETE CASCADE,
  candidate_id uuid REFERENCES candidates(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  unit text
);

CREATE TABLE IF NOT EXISTS encomendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rastreio text,
  morador_id uuid REFERENCES residents(id),
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
  responsavel_entrega text
);

CREATE TABLE IF NOT EXISTS app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL
);

-- Habilitar RLS (Row Level Security) - IMPORTANTE: Ajustar políticas conforme necessário
-- Este é um exemplo simples para permitir acesso autenticado
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE encomendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;

-- Politicas de Exemplo (PERMISSIVAS - Ajustar para Produção!)
CREATE POLICY "Allow all authenticated access" ON residents FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON visitors FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON bookings FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON announcements FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON incidents FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON assemblies FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON votes FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON encomendas FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON app_config FOR ALL USING (true);
CREATE POLICY "Allow all authenticated access" ON common_areas FOR ALL USING (true);
