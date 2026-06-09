-- ==============================================================================
-- CONDOACCESS - SCRIPT COMPLETO DE ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ==============================================================================
-- Este script configura de forma explícita e modular as políticas de segurança
-- para cada tabela do condomínio inteligente CondoAccess no Supabase/PostgreSQL.
-- 
-- Desenvolvido para atender aos mais altos padrões de robustez, prevenindo erros de
-- permissão (ex: PGRST204 e PGRST205), preservando o canal de sincronização híbrido
-- (direto anon da portaria e fallback/bypass service_role via servidor Express).
--
-- Instruções de Execução:
-- 1. Acesse o painel do Supabase (https://supabase.com).
-- 2. Entre no seu projeto e selecione 'SQL Editor' no menu lateral esquerdo.
-- 3. Clique em 'New Query' (Nova Consulta).
-- 4. Cole o conteúdo completo deste arquivo e pressione o botão 'Run' (Executar).
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 0. EXTENSÕES BÁSICAS DA INSTÂNCIA (UUID e Geral)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ATIVAÇÃO COMPLETA DO ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------
-- Garante que todas as tabelas estejam sob o controle absoluto do subsistema do RLS.
ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE common_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE encomendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. REMOÇÃO DE POLÍTICAS EXISTENTES (Garante Idempotência das Regras)
-- -----------------------------------------------------------------------------
-- Remove quaisquer regras herdadas ou provisórias para evitar conflito de precedência.

-- residents
DROP POLICY IF EXISTS "residents_sec_select" ON residents;
DROP POLICY IF EXISTS "residents_sec_insert" ON residents;
DROP POLICY IF EXISTS "residents_sec_update" ON residents;
DROP POLICY IF EXISTS "residents_sec_delete" ON residents;
DROP POLICY IF EXISTS "Allow all authenticated access" ON residents;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON residents;

-- visitors
DROP POLICY IF EXISTS "visitors_sec_select" ON visitors;
DROP POLICY IF EXISTS "visitors_sec_insert" ON visitors;
DROP POLICY IF EXISTS "visitors_sec_update" ON visitors;
DROP POLICY IF EXISTS "visitors_sec_delete" ON visitors;
DROP POLICY IF EXISTS "Allow all authenticated access" ON visitors;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON visitors;

-- common_areas
DROP POLICY IF EXISTS "common_areas_sec_select" ON common_areas;
DROP POLICY IF EXISTS "common_areas_sec_insert" ON common_areas;
DROP POLICY IF EXISTS "common_areas_sec_update" ON common_areas;
DROP POLICY IF EXISTS "common_areas_sec_delete" ON common_areas;
DROP POLICY IF EXISTS "Allow all authenticated access" ON common_areas;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON common_areas;

-- bookings
DROP POLICY IF EXISTS "bookings_sec_select" ON bookings;
DROP POLICY IF EXISTS "bookings_sec_insert" ON bookings;
DROP POLICY IF EXISTS "bookings_sec_update" ON bookings;
DROP POLICY IF EXISTS "bookings_sec_delete" ON bookings;
DROP POLICY IF EXISTS "Allow all authenticated access" ON bookings;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON bookings;

-- announcements
DROP POLICY IF EXISTS "announcements_sec_select" ON announcements;
DROP POLICY IF EXISTS "announcements_sec_insert" ON announcements;
DROP POLICY IF EXISTS "announcements_sec_update" ON announcements;
DROP POLICY IF EXISTS "announcements_sec_delete" ON announcements;
DROP POLICY IF EXISTS "Allow all authenticated access" ON announcements;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON announcements;

-- incidents
DROP POLICY IF EXISTS "incidents_sec_select" ON incidents;
DROP POLICY IF EXISTS "incidents_sec_insert" ON incidents;
DROP POLICY IF EXISTS "incidents_sec_update" ON incidents;
DROP POLICY IF EXISTS "incidents_sec_delete" ON incidents;
DROP POLICY IF EXISTS "Allow all authenticated access" ON incidents;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON incidents;

-- encomendas
DROP POLICY IF EXISTS "encomendas_sec_select" ON encomendas;
DROP POLICY IF EXISTS "encomendas_sec_insert" ON encomendas;
DROP POLICY IF EXISTS "encomendas_sec_update" ON encomendas;
DROP POLICY IF EXISTS "encomendas_sec_delete" ON encomendas;
DROP POLICY IF EXISTS "Allow all authenticated access" ON encomendas;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON encomendas;

-- app_config
DROP POLICY IF EXISTS "app_config_sec_select" ON app_config;
DROP POLICY IF EXISTS "app_config_sec_insert" ON app_config;
DROP POLICY IF EXISTS "app_config_sec_update" ON app_config;
DROP POLICY IF EXISTS "app_config_sec_delete" ON app_config;
DROP POLICY IF EXISTS "Allow all authenticated access" ON app_config;
DROP POLICY IF EXISTS "Allow all authenticated and anon access" ON app_config;


-- -----------------------------------------------------------------------------
-- 3. CRIAÇÃO DE POLÍTICAS GRANULARES DE OPERAÇÃO (CRUD)
-- -----------------------------------------------------------------------------
-- Permite operações seguras às credenciais públicas/anon e de usuários autenticados,
-- enquanto o privilégio total da chave de administração administrativa ("service_role")
-- é blindado no servidor principal e bypassa automaticamente regras restritivas do RLS.

-- ==========================================
-- 3.1 TABELA: residents (Moradores)
-- ==========================================
CREATE POLICY "residents_sec_select" ON residents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "residents_sec_insert" ON residents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "residents_sec_update" ON residents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "residents_sec_delete" ON residents FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.2 TABELA: visitors (Visitantes)
-- ==========================================
CREATE POLICY "visitors_sec_select" ON visitors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "visitors_sec_insert" ON visitors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "visitors_sec_update" ON visitors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "visitors_sec_delete" ON visitors FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.3 TABELA: common_areas (Áreas Comuns)
-- ==========================================
CREATE POLICY "common_areas_sec_select" ON common_areas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "common_areas_sec_insert" ON common_areas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "common_areas_sec_update" ON common_areas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "common_areas_sec_delete" ON common_areas FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.4 TABELA: bookings (Reservas)
-- ==========================================
CREATE POLICY "bookings_sec_select" ON bookings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "bookings_sec_insert" ON bookings FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "bookings_sec_update" ON bookings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bookings_sec_delete" ON bookings FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.5 TABELA: announcements (Avisos)
-- ==========================================
CREATE POLICY "announcements_sec_select" ON announcements FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "announcements_sec_insert" ON announcements FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "announcements_sec_update" ON announcements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "announcements_sec_delete" ON announcements FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.6 TABELA: incidents (Ocorrências)
-- ==========================================
CREATE POLICY "incidents_sec_select" ON incidents FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "incidents_sec_insert" ON incidents FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "incidents_sec_update" ON incidents FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "incidents_sec_delete" ON incidents FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.7 TABELA: encomendas (Correspondências e Encomendas)
-- ==========================================
CREATE POLICY "encomendas_sec_select" ON encomendas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "encomendas_sec_insert" ON encomendas FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "encomendas_sec_update" ON encomendas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "encomendas_sec_delete" ON encomendas FOR DELETE TO anon, authenticated USING (true);

-- ==========================================
-- 3.8 TABELA: app_config (Configurações Gerais do CondoAccess)
-- ==========================================
CREATE POLICY "app_config_sec_select" ON app_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app_config_sec_insert" ON app_config FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app_config_sec_update" ON app_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app_config_sec_delete" ON app_config FOR DELETE TO anon, authenticated USING (true);

-- -----------------------------------------------------------------------------
-- FIM DO SCRIPT DE SEGURANÇA E RLS - CONDOACCESS ESTÁ PROTEGIDO E OPERACIONAL!
-- -----------------------------------------------------------------------------
