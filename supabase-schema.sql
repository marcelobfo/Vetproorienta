-- Este arquivo serve como documentação de como estruturar seu banco Supabase (PostgreSQL) 
-- para suportar multitenancy (vários clientes/clínicas na mesma base de dados),
-- além de definir as tabelas de auditoria (logs) e sessões de chat.

-- 1. Tabela de Tenants (Clínicas / Assinantes)
CREATE TABLE public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  asaas_customer_id TEXT, -- Para integração de pagamentos
  subscription_status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Perfis de Usuários (Estendendo o auth.users do Supabase)
CREATE TABLE public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'tutor', -- 'admin', 'veterinario', 'tutor'
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Histórico de Chats de Triagem (Pre-diagnóstico IA)
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
  pet_name TEXT,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Logs de Auditoria Críticos
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- Ex: 'SUBSCRIPTION_PAID', 'CUSTOM_SCRIPT_EXECUTED'
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Configurações da IA (Prompt, Chaves de API)
CREATE TABLE public.ai_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  provider TEXT DEFAULT 'gemini', -- 'gemini' ou 'openai'
  api_key TEXT, -- Em produção, ideal usar extensão pgsodium para criptografia
  system_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Base de Conhecimento (Materiais para a IA consultar)
CREATE TABLE public.knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que um Tenant não acesse dados de outro.
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Função Helper para pegar o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas de user_profiles
CREATE POLICY "Usuários veem perfis do próprio tenant" 
ON public.user_profiles FOR SELECT 
USING (tenant_id = public.current_user_tenant_id());

CREATE POLICY "Super Admins gerenciam todos os perfis do tenant" 
ON public.user_profiles FOR ALL 
USING (
  tenant_id = public.current_user_tenant_id()
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Usuário pode editar próprio perfil" 
ON public.user_profiles FOR UPDATE 
USING (id = auth.uid());

-- Políticas de chat_sessions
CREATE POLICY "Tutores veem seus próprios chats, Admins veem tudo do tenant" 
ON public.chat_sessions FOR ALL 
USING (
  tenant_id = public.current_user_tenant_id() 
  AND (
    user_id = auth.uid() OR 
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) IN ('admin', 'veterinario')
  )
);

-- Políticas de audit_logs (Apenas leitura para admins do tenant, inserção apenas via service role/backend)
CREATE POLICY "Admins leem logs do tenant" 
ON public.audit_logs FOR SELECT 
USING (
  tenant_id = public.current_user_tenant_id()
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- Políticas de AI Settings e Knowledge Base (Apenas Admins gerenciam)
CREATE POLICY "Admins gerenciam config de IA" 
ON public.ai_settings FOR ALL 
USING (
  tenant_id = public.current_user_tenant_id()
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admins gerenciam base de conhecimento" 
ON public.knowledge_base FOR ALL 
USING (
  tenant_id = public.current_user_tenant_id()
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

-- ==========================================
-- SUPER ADMIN GLOBAL POLICIES
-- Cria uma função helper isolada para evitar recursões ao verificar super admin
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Super Admin tem acesso irrestrito a Tenants
CREATE POLICY "Super admin ve todos os tenants" 
ON public.tenants FOR ALL USING (public.is_super_admin());

-- Super Admin tem acesso irrestrito a User Profiles
CREATE POLICY "Super admin gerencia perfis globais" 
ON public.user_profiles FOR ALL USING (public.is_super_admin());

-- DICA PARA CRIAR O PRIMEIRO SUPER ADMIN:
-- 1. Crie uma conta normalmente pelo sistema (que vai cair como 'admin' de uma clínica).
-- 2. Vá no SQL Editor do Supabase e rode:
--    UPDATE public.user_profiles SET role = 'super_admin' WHERE email = 'seu_email@aqui.com';

