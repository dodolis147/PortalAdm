-- 1. Create tables if they don't exist
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
  validity_duration text,
  auto_released boolean DEFAULT false
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
  responsavel_entrega text
);

-- 2. Ensure missing columns exist
DO $$
BEGIN
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
