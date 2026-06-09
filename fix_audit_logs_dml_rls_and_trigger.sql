-- =========================================================================
-- CORREÇÃO DE SEGURANÇA E POLÍTICAS RLS - CENTRAL DE AUDITORIA (DML)
-- COPIA Remix / CondoAccess v2.4
-- =========================================================================
--
-- INSTRUÇÕES DE EXECUÇÃO:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com).
-- 2. Vá para "SQL Editor" no menu lateral esquerdo.
-- 3. Crie uma nova query, cole o conteúdo deste arquivo e clique em "Run".
--
-- =========================================================================

-- 1. REDEFINIÇÃO DA FUNÇÃO DO GATILHO COM "SECURITY DEFINER"
-- Especificar 'SECURITY DEFINER' força a execução da função com os privilégios
-- do usuário criador (normalmente o superusuário 'postgres'). Isso ignora RLS
-- na inserção à tabela 'audit_logs_DML' no momento que um usuário anônimo ou de
-- menor permissão salvar dados nas tabelas auditadas da aplicação.
-- 'SET search_path = public' previne vulnerabilidades de sequestro de caminho de busca.

CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    old_val jsonb := null;
    new_val jsonb := null;
    user_val text := 'SYSTEM_AUTH';
BEGIN
    -- Captura do usuário logado ou token JWT de sessão
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

-- 2. AJUSTE DE SEGURANÇA ROW LEVEL SECURITY NA TABELA audit_logs_DML
-- Habilita segurança contra manipulação externa direta por usuários anônimos / maliciosos,
-- salvaguardando a integridade das auditorias já gravadas.

ALTER TABLE public.audit_logs_DML ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas caso existam
DROP POLICY IF EXISTS "Apenas MASTER pode ler auditoria DML" ON public.audit_logs_DML;
DROP POLICY IF EXISTS "Todos podem ler auditoria DML" ON public.audit_logs_DML;

-- Política de Leitura: Apenas o painel administrativo MASTER e administradores autorizados
-- conseguem analisar os registros de alterações de banco (DML).
CREATE POLICY "Apenas MASTER pode ler auditoria DML" ON public.audit_logs_DML
FOR SELECT
USING (
    coalesce(auth.jwt() ->> 'role', '') IN ('MASTER', 'Administrador')
);

-- Nota: Como o trigger roda em modo 'SECURITY DEFINER' (como superusuário), as inserções
-- disparadas por gatilhos de moradores ignoram as restrições normais de gravação direta e
-- gravam de forma blindada, sem necessidade de expor política de INSERT público no banco.

-- Adicional de Robustez: Criar uma política RLS APPEND-ONLY de INSERT seguro
-- para anon e authenticated. Isso garante funcionamento mesmo se por ventura o trigger
-- for invocado em um contexto restrito ou com herança de permissões diferenciada.
DROP POLICY IF EXISTS "Permitir insercao anonima e autenticada de auditoria" ON public.audit_logs_DML;
CREATE POLICY "Permitir insercao anonima e autenticada de auditoria" ON public.audit_logs_DML
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permite explicitamente as operações de INSERT para anon e authenticated na tabela de logs
GRANT SELECT, INSERT ON public.audit_logs_DML TO postgres, service_role;
GRANT INSERT ON public.audit_logs_DML TO anon, authenticated;

