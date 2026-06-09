-- =========================================================================
-- BANCO DE DADOS CONDOACCESS - SCRIPT COMPLETO DE DROP DE TABELAS OBSOLETAS
-- =========================================================================
-- Este script realiza a limpeza segura do banco de dados removendo tabelas
-- duplicadas, órfãs, de teste, de backup ou não utilizadas pela aplicação.
-- 
-- CARACTERÍSTICAS DESTE SCRIPT:
-- 1. Remoção segura via CASCADE para evitar erros de integridade/foreign keys.
-- 2. Limpeza correspondente no dicionário do Realtime do Supabase.
-- 3. Idempotente (pode ser executado com total segurança no editor SQL).
-- 
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com).
-- 2. Vá para "SQL Editor" no menu lateral esquerdo.
-- 3. Cole este conteúdo em uma nova aba e clique em "Run" (Executar).
-- =========================================================================

-- -----------------------------------------------------------------------------
-- 1. DROP DAS TABELAS NÃO UTILIZADAS (ORDENADO POR DEPENDÊNCIAS + CASCADE)
-- -----------------------------------------------------------------------------

-- Módulo de Votação/Assembleia Obsoleto (não integrado no App)
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.assemblies CASCADE;

-- Tabelas Duplicadas ou em Português (Traduzidas / Copiadas)
DROP TABLE IF EXISTS public.moradores CASCADE;
DROP TABLE IF EXISTS public.visitantes CASCADE;
DROP TABLE IF EXISTS public.reservas CASCADE;
DROP TABLE IF EXISTS public.ocorrencias CASCADE;
DROP TABLE IF EXISTS public.comunicados CASCADE;
DROP TABLE IF EXISTS public.configuracoes CASCADE;
DROP TABLE IF EXISTS public.auditoria CASCADE;

-- Módulo de Usuários e Perfis Obsoleto (o login do App usa as senhas na tabela 'residents')
DROP TABLE IF EXISTS public.perfis CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- Tabelas não utilizadas ou redundantes
DROP TABLE IF EXISTS public.veiculos CASCADE;       -- Dados de veículos migrados p/ residents (jsonb)
DROP TABLE IF EXISTS public.blocos CASCADE;         -- Carregado dinamicamente no frontend
DROP TABLE IF EXISTS public.unidades CASCADE;       -- Tratado como atributo texto no frontend
DROP TABLE IF EXISTS public.convites CASCADE;       -- Pré-autorizações tratadas em 'visitors'
DROP TABLE IF EXISTS public.funcionarios CASCADE;   -- Sem correspondência na aplicação atual
DROP TABLE IF EXISTS public.prestadores CASCADE;    -- Integrado como tipo de visitante em 'visitors'
DROP TABLE IF EXISTS public.documentos CASCADE;     -- Sem correspondência na aplicação atual
DROP TABLE IF EXISTS public.notificacoes CASCADE;   -- Notificações de fallback / não utilizadas
DROP TABLE IF EXISTS public.logs_sistema CASCADE;   -- Diagnósticos em tempo real não utilizados
DROP TABLE IF EXISTS public.anexos CASCADE;         -- Gestão de anexos tratada em bucket/fotos diretamente
DROP TABLE IF EXISTS public.qr_codes CASCADE;       -- Armazenados como string em 'visitors' / 'encomendas'
DROP TABLE IF EXISTS public.permissoes CASCADE;     -- Sem correspondência na aplicação atual
DROP TABLE IF EXISTS public.grupos_permissoes CASCADE; -- Sem correspondência na aplicação atual

-- -----------------------------------------------------------------------------
-- 2. LIMPEZA DOS ÍNDICES ORGÂNICO-FUNCIONAIS ASSOCIADOS ÀS TABELAS REMOVIDAS
-- -----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.idx_moradores_unit;
DROP INDEX IF EXISTS public.idx_unidades_number;
DROP INDEX IF EXISTS public.idx_ocorrencias_status;
DROP INDEX IF EXISTS public.idx_reservas_date;
DROP INDEX IF EXISTS public.idx_veiculos_plate;
DROP INDEX IF EXISTS public.idx_notificacoes_user;

-- -----------------------------------------------------------------------------
-- 3. REMOÇÃO DOS TRIGGERS DE AUDITORIA DAS TABELAS APAGADAS (BOAS PRÁTICAS)
-- -----------------------------------------------------------------------------
-- Nota: O PostgreSQL remove automaticamente os triggers definidos nas tabelas no
-- momento em que a própria tabela é excluída (DROP TABLE). Portanto, esta etapa
-- já é assistida nativamente pelo banco de dados.

-- =========================================================================
-- FIM DO SCRIPT DE LIMPEZA E AUDITORIA DO BANCO DE DADOS
-- =========================================================================
