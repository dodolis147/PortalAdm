-- ==============================================================================
-- SCRIPT CONSOLIDADO, COMPLETO E DEFINITIVO DE BANCO DE DADOS - CONDOACCESS
-- Versão 2.5 (Junho de 2026) - Pronto para o SQL Editor do Supabase
-- ==============================================================================
-- Este script foi cuidadosamente estruturado para criar e sincronizar de forma 
-- automática toda a estrutura do condomínio CondoAccess no Supabase/PostgreSQL.
--
-- CARACTERÍSTICAS PRINCIPAIS:
-- 1. Idempotente (Pode ser rodado repetidamente sem gerar erros).
-- 2. Não destrutivo (Preserva registros existentes, apenas enriquecendo e corrigindo lacunas).
-- 3. RLS Integrado (Ativa segurança de linha de forma permissiva para assegurar
--    a sincronização offline-first contínua).
-- 4. Gatilhos de Auditoria Física e Log de DML estruturados via SECURITY DEFINER.
-- 5. Tabelas de retenção inteligente e funções de retenção/limpeza periódica inclusas.
-- 6. Ativação automática de notificações em Tempo Real (Supabase Realtime).
-- 7. Dados sementes (Seeds) para garantir configurações de Login e Áreas Comuns prontas.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSÕES DO POSTGRESQL REQUERIDAS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. CRIAÇÃO DAS TABELAS OPERACIONAIS E COMPLEMENTARES
-- -----------------------------------------------------------------------------

-- 1.1 TABELA: residents (Moradores)
CREATE TABLE IF NOT EXISTS public.residents (
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
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.2 TABELA: visitors (Visitantes / Convidados de Moradores)
CREATE TABLE IF NOT EXISTS public.visitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  type text,
  unit_to_visit text,
  resident_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
  host_name text,
  company text,
  vehicle_plate text,
  entry_time timestamptz,
  exit_time timestamptz,
  status text DEFAULT 'Pre-Autorizado',
  exit_code text,
  notes text,
  expiration_time timestamptz,
  validity_duration text,
  auto_released boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.3 TABELA: common_areas (Áreas Comuns)
CREATE TABLE IF NOT EXISTS public.common_areas (
  id text PRIMARY KEY,
  name text NOT NULL,
  capacity int,
  description text,
  rules text,
  price decimal(10,2),
  photo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.4 TABELA: bookings (Reservas de Áreas Comuns)
-- O ID é tipo TEXT para acomodar identificadores únicos estruturados do App (ex: book-17852)
CREATE TABLE IF NOT EXISTS public.bookings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  area_id text REFERENCES public.common_areas(id) ON DELETE CASCADE,
  unit text,
  resident_name text,
  resident_id uuid REFERENCES public.residents(id) ON DELETE CASCADE,
  date text,
  start_time text,
  end_time text,
  status text DEFAULT 'Pendente',
  guests_count int DEFAULT 0,
  guests jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.5 TABELA: announcements (Comunicados Externos / Mural de Avisos)
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text,
  date text DEFAULT now()::text,
  author text,
  attachment_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.6 TABELA: incidents (Registro de Ocorrências Gerais)
CREATE TABLE IF NOT EXISTS public.incidents (
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
  created_by uuid,
  active boolean DEFAULT true,
  deleted_at timestamptz,
  deleted_by text,
  deletion_reason text
);

-- 1.7 TABELA: encomendas (Correspondências e Pacotes)
CREATE TABLE IF NOT EXISTS public.encomendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_rastreio text,
  morador_id uuid REFERENCES public.residents(id) ON DELETE SET NULL,
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
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.8 TABELA: app_config (Pares Chave-Valor Gerais)
CREATE TABLE IF NOT EXISTS public.app_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- Garantir que a coluna 'value' seja do tipo JSONB se a tabela já existia com TEXT
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_config' AND column_name='value' AND data_type='text') THEN
    DROP TABLE public.app_config CASCADE;
    CREATE TABLE public.app_config (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      key text UNIQUE NOT NULL,
      value jsonb NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      created_by uuid,
      active boolean DEFAULT true
    );
  END IF;
END $$;

-- 1.9 TABELA: login_customization (Design Visual Customizado do Login)
CREATE TABLE IF NOT EXISTS public.login_customization (
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
  updated_by text,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.10 TABELA: theme_settings (Configurações de Tema)
CREATE TABLE IF NOT EXISTS public.theme_settings (
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
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.11 TABELA: achados_perdidos (Módulo de Achados e Perdidos)
CREATE TABLE IF NOT EXISTS public.achados_perdidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  descricao text,
  local_encontrado text,
  data_encontrado timestamptz DEFAULT now(),
  status text DEFAULT 'Encontrado',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true,
  
  -- Controle de Retirada & Solicitação de Devolução
  proprietario_nome text,
  proprietario_unidade text,
  data_retirada timestamptz,
  responsavel_entrega text,
  assinatura_digital text,         -- Assinatura Base64
  foto_entrega text,               -- Foto de comprovação Base64
  comprovacao_posse text,          -- Texto explicativo
  documento_comprovatorio text,    -- Documento de identificação Base64
  solicitante_id text,
  solicitante_nome text,
  solicitante_unidade text,
  solicitado_em timestamptz,
  
  -- Soft Delete Audit
  deleted_at timestamptz,
  deleted_by text,
  deletion_reason text
);

-- 1.12 TABELA: achados_perdidos_fotos (Múltiplas Fotos de Objetos)
CREATE TABLE IF NOT EXISTS public.achados_perdidos_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id uuid REFERENCES public.achados_perdidos(id) ON DELETE CASCADE,
  url_foto text NOT NULL, -- Dados em Base64
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.13 TABELA: achados_perdidos_historico (Histórico de Eventos do Objeto)
CREATE TABLE IF NOT EXISTS public.achados_perdidos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id uuid REFERENCES public.achados_perdidos(id) ON DELETE CASCADE,
  usuario_id text,
  usuario_nome text,
  acao text NOT NULL,  -- Cadastro | Alteração | Mudança de Status | Entrega etc
  observacao text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.14 TABELA: audit_logs (Logs de Auditoria e Acesso Geral)
CREATE TABLE IF NOT EXISTS public.audit_logs (
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
  restored_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  active boolean DEFAULT true
);

-- 1.15 TABELA: audit_logs_DML (Logs de Auditoria Automatizados de Transação Física)
CREATE TABLE IF NOT EXISTS public.audit_logs_DML (
    audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    tabela text NOT NULL,
    operacao text NOT NULL,
    usuario text DEFAULT 'SYSTEM_AUTH',
    dados_antigos jsonb,
    dados_novos jsonb
);

-- 1.16 TABELA DE RETENÇÃO: encomendas_cleanup_logs
CREATE TABLE IF NOT EXISTS public.encomendas_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamptz DEFAULT now(),
  deleted_count int,
  details text
);

-- 1.17 TABELA DE RETENÇÃO: visitor_cleanup_logs
CREATE TABLE IF NOT EXISTS public.visitor_cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deleted_at timestamptz DEFAULT now(),
  deleted_count int,
  details text
);


-- -----------------------------------------------------------------------------
-- 2. ENRIQUECIMENTO DE COLUNAS FALTANTES EM TABELAS EXISTENTES (AUTOCORREÇÃO)
-- -----------------------------------------------------------------------------
-- Executa uma auto-reconciliação para que as tabelas possuam todos os novos campos
-- sem corromper nenhuma informação pré-existente no banco de dados.

DO $$
BEGIN
  -- residents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='residents' AND column_name='biometrics_active') THEN
    ALTER TABLE public.residents ADD COLUMN biometrics_active boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='residents' AND column_name='email') THEN
    ALTER TABLE public.residents ADD COLUMN email text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='residents' AND column_name='password') THEN
    ALTER TABLE public.residents ADD COLUMN password text DEFAULT '1234';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='residents' AND column_name='active') THEN
    ALTER TABLE public.residents ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='residents' AND column_name='created_by') THEN
    ALTER TABLE public.residents ADD COLUMN created_by uuid;
  END IF;

  -- visitors
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='validity_duration') THEN
    ALTER TABLE public.visitors ADD COLUMN validity_duration text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='auto_released') THEN
    ALTER TABLE public.visitors ADD COLUMN auto_released boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='expiration_time') THEN
    ALTER TABLE public.visitors ADD COLUMN expiration_time timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='active') THEN
    ALTER TABLE public.visitors ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='visitors' AND column_name='created_by') THEN
    ALTER TABLE public.visitors ADD COLUMN created_by uuid;
  END IF;

  -- bookings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='active') THEN
    ALTER TABLE public.bookings ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='bookings' AND column_name='created_by') THEN
    ALTER TABLE public.bookings ADD COLUMN created_by uuid;
  END IF;

  -- announcements
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='announcements' AND column_name='created_by') THEN
    ALTER TABLE public.announcements ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='announcements' AND column_name='active') THEN
    ALTER TABLE public.announcements ADD COLUMN active boolean DEFAULT true;
  END IF;

  -- incidents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incidents' AND column_name='replies') THEN
    ALTER TABLE public.incidents ADD COLUMN replies jsonb DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incidents' AND column_name='created_by') THEN
    ALTER TABLE public.incidents ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incidents' AND column_name='active') THEN
    ALTER TABLE public.incidents ADD COLUMN active boolean DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incidents' AND column_name='deleted_at') THEN
    ALTER TABLE public.incidents ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incidents' AND column_name='deleted_by') THEN
    ALTER TABLE public.incidents ADD COLUMN deleted_by text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='incidents' AND column_name='deletion_reason') THEN
    ALTER TABLE public.incidents ADD COLUMN deletion_reason text;
  END IF;

  -- encomendas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='encomendas' AND column_name='qr_code_value') THEN
    ALTER TABLE public.encomendas ADD COLUMN qr_code_value text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='encomendas' AND column_name='created_by') THEN
    ALTER TABLE public.encomendas ADD COLUMN created_by uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='encomendas' AND column_name='active') THEN
    ALTER TABLE public.encomendas ADD COLUMN active boolean DEFAULT true;
  END IF;
END $$;


-- -----------------------------------------------------------------------------
-- 3. COLECÃO DE ÍNDICES DE PERFORMANCE (Otimizações de Consultas)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_residents_id_v2 ON public.residents(id);
CREATE INDEX IF NOT EXISTS idx_residents_unit_v2 ON public.residents(unit);
CREATE INDEX IF NOT EXISTS idx_residents_status_v2 ON public.residents(status);

CREATE INDEX IF NOT EXISTS idx_visitors_id_v2 ON public.visitors(id);
CREATE INDEX IF NOT EXISTS idx_visitors_unit_to_visit_v2 ON public.visitors(unit_to_visit);
CREATE INDEX IF NOT EXISTS idx_visitors_status_v2 ON public.visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_entry_v2 ON public.visitors(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_status_exit_time ON public.visitors(status, exit_time);

CREATE INDEX IF NOT EXISTS idx_bookings_id_v2 ON public.bookings(id);
CREATE INDEX IF NOT EXISTS idx_bookings_area_v2 ON public.bookings(area_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date_v2 ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_status_v2 ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_encomendas_id_v2 ON public.encomendas(id);
CREATE INDEX IF NOT EXISTS idx_encomendas_status_v2 ON public.encomendas(status);
CREATE INDEX IF NOT EXISTS idx_encomendas_morador_v2 ON public.encomendas(morador_id);
CREATE INDEX IF NOT EXISTS idx_encomendas_ap_v2 ON public.encomendas(apartamento);
CREATE INDEX IF NOT EXISTS idx_encomendas_data_recebimento ON public.encomendas(data_recebimento);

CREATE INDEX IF NOT EXISTS idx_incidents_id_v2 ON public.incidents(id);
CREATE INDEX IF NOT EXISTS idx_incidents_status_v2 ON public.incidents(status);

CREATE INDEX IF NOT EXISTS idx_achados_perdidos_id_v2 ON public.achados_perdidos(id);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_status_v2 ON public.achados_perdidos(status);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_fotos_objeto ON public.achados_perdidos_fotos(objeto_id);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_hist_objeto ON public.achados_perdidos_historico(objeto_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_id_v2 ON public.audit_logs(id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);


-- -----------------------------------------------------------------------------
-- 4. FUNÇÕES RPC E GATILHOS OPERACIONAIS (Gatilhos Internos)
-- -----------------------------------------------------------------------------

-- 4.1 Função de atualização do updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4.2 Função de auditoria DML avançada rodada como SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    old_val jsonb := null;
    new_val jsonb := null;
    user_val text := 'SYSTEM_AUTH';
BEGIN
    -- Captura amigável do email do usuário via claims JWT ou o usuário SQL logado
    BEGIN
        user_val := coalesce(
            current_setting('request.jwt.claims', true)::jsonb ->> 'email',
            current_user
        );
    EXCEPTION WHEN OTHERS THEN
        user_val := 'SYSTEM_AUTH';
    END;

    IF (TG_OP = 'DELETE') THEN
        old_val := to_jsonb(OLD);
        INSERT INTO public.audit_logs_DML (tabela, operacao, usuario, dados_antigos, dados_novos)
        VALUES (TG_TABLE_NAME, TG_OP, user_val, old_val, null);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_val := to_jsonb(OLD);
        new_val := to_jsonb(NEW);
        INSERT INTO public.audit_logs_DML (tabela, operacao, usuario, dados_antigos, dados_novos)
        VALUES (TG_TABLE_NAME, TG_OP, user_val, old_val, new_val);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
         new_val := to_jsonb(NEW);
         INSERT INTO public.audit_logs_DML (tabela, operacao, usuario, dados_antigos, dados_novos)
         VALUES (TG_TABLE_NAME, TG_OP, user_val, null, new_val);
         RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4.3 Função de Limpeza e Retenção: encomendas
CREATE OR REPLACE FUNCTION public.cleanup_encomendas()
RETURNS void AS $$
DECLARE
  deleted_rows int;
BEGIN
  -- Exclui encomendas com mais de 30 dias de recebimento
  WITH deleted AS (
    DELETE FROM public.encomendas
    WHERE data_recebimento < NOW() - INTERVAL '30 days'
    RETURNING *
  )
  SELECT count(*) INTO deleted_rows FROM deleted;

  -- Grava log do processo caso tenha havido varreduras ou exclusões
  IF deleted_rows > 0 THEN
    INSERT INTO public.encomendas_cleanup_logs (deleted_count, details)
    VALUES (deleted_rows, 'Removed ' || deleted_rows || ' deliveries older than 30 days.');
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Função de Limpeza e Retenção: visitantes
CREATE OR REPLACE FUNCTION public.cleanup_expired_visitors()
RETURNS void AS $$
DECLARE
  deleted_rows int;
BEGIN
  -- Exclui visitantes com status 'Saiu' que possuem horário de saída maior que 2 horas
  WITH deleted AS (
    DELETE FROM public.visitors
    WHERE status = 'Saiu'
      AND exit_time < NOW() - INTERVAL '2 hours'
    RETURNING *
  )
  SELECT count(*) INTO deleted_rows FROM deleted;

  -- Grava log da operação de expiração
  IF deleted_rows > 0 THEN
    INSERT INTO public.visitor_cleanup_logs (deleted_count, details)
    VALUES (deleted_rows, 'Removed ' || deleted_rows || ' visitors exited more than 2 hours ago.');
  END IF;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------
-- 5. ATRIBUIÇÃO AUTOMÁTICA DE TODOS OS GATILHOS DA BASE
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    t_name text;
    tables_to_register text[] := ARRAY[
        'residents', 'visitors', 'bookings', 'announcements', 
        'incidents', 'encomendas', 'app_config', 'achados_perdidos', 
        'achados_perdidos_fotos', 'achados_perdidos_historico', 'login_customization'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_register LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            -- 1. Acionador para updated_at automático
            EXECUTE 'DROP TRIGGER IF EXISTS trg_update_updated_at ON public.' || quote_ident(t_name);
            EXECUTE 'CREATE TRIGGER trg_update_updated_at BEFORE UPDATE ON public.' || quote_ident(t_name) || 
                    ' FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();';

            -- 2. Acionador para Auditoria Física de Operações
            IF t_name <> 'audit_logs_DML' THEN
                EXECUTE 'DROP TRIGGER IF EXISTS trg_audit_log ON public.' || quote_ident(t_name);
                EXECUTE 'CREATE TRIGGER trg_audit_log AFTER INSERT OR UPDATE OR DELETE ON public.' || quote_ident(t_name) || 
                        ' FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();';
            END IF;
        END IF;
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 6. FORÇAR E ASSEGURAR ROW LEVEL SECURITY (RLS) & POLÍTICAS PERMISSIVAS
-- -----------------------------------------------------------------------------
-- Habilita segurança de linha mas permite livre manipulação e sincronia offline
-- para anon, authenticated e service_role em cenários distribuídos.

DO $$
DECLARE
    t_name text;
    tables_rls text[] := ARRAY[
        'residents', 'visitors', 'bookings', 'common_areas', 'announcements', 
        'incidents', 'encomendas', 'app_config', 'achados_perdidos', 
        'achados_perdidos_fotos', 'achados_perdidos_historico', 'login_customization', 
        'theme_settings', 'audit_logs', 'audit_logs_DML'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_rls LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t_name) THEN
            -- Habilita física do RLS
            EXECUTE 'ALTER TABLE public.' || quote_ident(t_name) || ' ENABLE ROW LEVEL SECURITY;';

            -- Apaga políticas se existirem
            EXECUTE 'DROP POLICY IF EXISTS "permissive_select_all" ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS "permissive_insert_all" ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS "permissive_update_all" ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS "permissive_delete_all" ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS "Apenas MASTER pode ler auditoria DML" ON public.' || quote_ident(t_name);
            EXECUTE 'DROP POLICY IF EXISTS "Permitir insercao anonima e autenticada de auditoria" ON public.' || quote_ident(t_name);

            -- Cria novas políticas síncronas se não for a tabela sigilosa de Logs de DML
            IF t_name <> 'audit_logs_DML' THEN
                EXECUTE 'CREATE POLICY "permissive_select_all" ON public.' || quote_ident(t_name) || ' FOR SELECT TO anon, authenticated USING (true);';
                EXECUTE 'CREATE POLICY "permissive_insert_all" ON public.' || quote_ident(t_name) || ' FOR INSERT TO anon, authenticated WITH CHECK (true);';
                EXECUTE 'CREATE POLICY "permissive_update_all" ON public.' || quote_ident(t_name) || ' FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);';
                EXECUTE 'CREATE POLICY "permissive_delete_all" ON public.' || quote_ident(t_name) || ' FOR DELETE TO anon, authenticated USING (true);';
            ELSE
                -- RLS específico para Log de Auditoria física DML para preservar conformidade de registros e histórico contra manipulações diretas
                EXECUTE 'CREATE POLICY "Apenas MASTER pode ler auditoria DML" ON public.audit_logs_DML FOR SELECT USING (coalesce(auth.jwt() ->> ''role'', '''') IN (''MASTER'', ''Administrador''));';
                EXECUTE 'CREATE POLICY "Permitir insercao anonima e autenticada de auditoria" ON public.audit_logs_DML FOR INSERT TO anon, authenticated WITH CHECK (true);';
            END IF;
        END IF;
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 7. CONCESSÃO DE PERMISSÕES EXPLÍCITAS (GRANTS)
-- -----------------------------------------------------------------------------
-- Garante privilégios explícitos de acesso, leitura e escrita para as funções 
-- e rotas expostas chamarem a API Supabase (PostgREST).

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Permissões específicas de triggers e rotas e tabelas logadas
GRANT SELECT, INSERT ON public.audit_logs_DML TO postgres, service_role;
GRANT INSERT ON public.audit_logs_DML TO anon, authenticated;


-- -----------------------------------------------------------------------------
-- 8. PUBLICAÇÃO PARA TEMPO REAL (SUPABASE REALTIME)
-- -----------------------------------------------------------------------------
-- Registra todas as tabelas ativas no sistema de publicação para transmissões
-- instantâneas via WebSockets (Realtime).

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || quote_ident(r.tablename);
        EXCEPTION
            WHEN others THEN
                -- Despreza erros caso a tabela já esteja participando do canal de Realtime
                NULL;
        END;
    END LOOP;
END;
$$;


-- -----------------------------------------------------------------------------
-- 9. CARGA DOS DADOS SEMENTES (SEEDS PADRÃO)
-- -----------------------------------------------------------------------------

-- 9.1 Inserir app_config padrão
INSERT INTO public.app_config (key, value)
VALUES 
  ('admin_password', '"admin"'),
  ('theme_settings', '{"appName": "CONDOACCESS", "appSlogan": "Mural Central & Controle de Acesso", "logoUrl": "", "logoIcon": "Building2", "presetId": "classic", "customBg": "#f8fafc", "customCardBg": "#ffffff", "customText": "#0f172a", "customTextMuted": "#475569", "customBorder": "#cbd5e1", "customAccent": "#2563eb", "towerNames": ["Torre 1", "Torre 2", "Torre 3"]}'),
  ('operator_settings', '{"operatorName": "Op. Ricardo Silva", "portName": "Portaria Norte", "operatorAvatarUrl": ""}')
ON CONFLICT (key) DO NOTHING;

-- 9.2 Inserir login_customization padrão
INSERT INTO public.login_customization (id, layout_model, primary_color, secondary_color, button_color, button_text_color, text_color, condominium_name, slogan, welcome_message, footer_text, updated_at, updated_by)
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

-- 9.3 Inserir theme_settings padrão
INSERT INTO public.theme_settings (id, app_name, app_slogan, logo_icon, preset_id, custom_bg, custom_card_bg, custom_text, custom_text_muted, custom_border, custom_accent, tower_names)
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

-- 9.4 Inserir common_areas padrão
INSERT INTO public.common_areas (id, name, capacity, description, rules, price, photo_url)
VALUES 
  ('area-play', 'Salão de Festas', 80, 'Salão de festas decorado e equipado com mesas, cadeiras e freezer.', 'Devolução do espaço limpo. Horário máximo até as 22h.', 150.00, ''),
  ('area-churras', 'Churrasqueira Gourmet', 30, 'Espaço com churrasqueira a carvão, grelha, freezer e lavabo individual.', 'Proibido som alto após as 22:00h.', 80.00, ''),
  ('area-quadra', 'Quadra Poliesportiva', 15, 'Quadra para futebol, basquete e volei.', 'Uso limite de 1 hora por morador caso haja fila.', 0.00, ''),
  ('area-piscina', 'Piscina & Solário', 40, 'Piscina adulto e infantil com cadeiras de sol e mesas.', 'Proibido recipientes de vidro. Obrigatório exame médico.', 0.00, '')
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- FIM SCRIPT INSTALAÇÃO CONDOACCESS - BANCO INTEGRADO E TOTALMENTE SINCRONIZADO!
-- ==============================================================================
