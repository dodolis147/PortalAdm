-- =========================================================================
-- MÓDULO: ACHADOS E PERDIDOS E PERSONALIZAÇÃO DE DESIGN (SUPABASE DDL)
-- =========================================================================
-- Script corretivo para criar as tabelas ausentes no Supabase necessárias
-- para o módulo "Achados e Perdidos" e o layout "Login Customization".
--
-- Para aplicar: copie e cole na consulta SQL (SQL Editor) do seu Console Supabase.
-- =========================================================================

-- 1. TABELA PRINCIPAL DE ACHADOS E PERDIDOS
CREATE TABLE IF NOT EXISTS achados_perdidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  categoria text NOT NULL,
  descricao text,
  local_encontrado text,
  data_encontrado timestamptz DEFAULT now(),
  status text DEFAULT 'Encontrado' CHECK (status IN ('Encontrado', 'Aguardando identificação', 'Reservado para retirada', 'Devolvido ao proprietário', 'Encerrado')),
  criado_por text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Retirada e comprovação
  proprietario_nome text,
  proprietario_unidade text,
  data_retirada timestamptz,
  responsavel_entrega text,
  assinatura_digital text, -- Formato Base64 curto/longo
  foto_entrega text,       -- Formato Base64 / URL
  comprovacao_posse text,
  documento_comprovatorio text, -- Base64 / URL
  solicitante_id text,
  solicitante_nome text,
  solicitante_unidade text,
  solicitado_em timestamptz,

  -- Soft delete audit
  deleted_at timestamptz,
  deleted_by text,
  deletion_reason text
);

-- 2. TABELA DE COMPLEMENTO DE IMPRENSA/MÚLTIPLAS FOTOS
CREATE TABLE IF NOT EXISTS achados_perdidos_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id uuid REFERENCES achados_perdidos(id) ON DELETE CASCADE,
  url_foto text NOT NULL, -- Base64 completo
  created_at timestamptz DEFAULT now()
);

-- 3. TABELA DE LOGS DE HISTÓRICO ESPECÍFICO DO OBJETO
CREATE TABLE IF NOT EXISTS achados_perdidos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objeto_id uuid REFERENCES achados_perdidos(id) ON DELETE CASCADE,
  usuario_id text,
  usuario_nome text,
  acao text NOT NULL, -- Cadastro | Alteração | Inclusão de fotos | Solicitação de devolução | Aprovação | Entrega | Encerramento | Exclusão
  observacao text,
  created_at timestamptz DEFAULT now()
);

-- 4. TABELA DE PERSONALIZAÇÃO VISUAL DO LOGIN DO CONDOMÍNIO
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

-- =========================================================================
-- POLÍTICAS DE SEGURANÇA ROW-LEVEL SECURITY (RLS)
-- =========================================================================

-- Habilitar RLS
ALTER TABLE achados_perdidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE achados_perdidos_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE achados_perdidos_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_customization ENABLE ROW LEVEL SECURITY;

-- Políticas gerais permissivas para autenticação / bypass integrado
CREATE POLICY "Permissive all for achados_perdidos" 
  ON achados_perdidos FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permissive all for achados_perdidos_fotos" 
  ON achados_perdidos_fotos FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permissive all for achados_perdidos_historico" 
  ON achados_perdidos_historico FOR ALL 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "Permissive all for login_customization" 
  ON login_customization FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Índices úteis para performance
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_status ON achados_perdidos(status);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_fotos_objeto ON achados_perdidos_fotos(objeto_id);
CREATE INDEX IF NOT EXISTS idx_achados_perdidos_hist_objeto ON achados_perdidos_historico(objeto_id);
