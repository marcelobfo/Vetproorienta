-- ==============================================================================
-- SCHEMA COMPLETO E ATUALIZADO SUPABASE (POSTGRESQL) - VETPRO ORIENTA SAAS
-- Suporta: Múltiplas Clínicas (Tenants), Planos SaaS e Gateway Asaas,
-- CRMV de Veterinários, Caderneta de Vacinação Digital com Lembretes WhatsApp,
-- Triagem Inteligente com IA, Base de Conhecimento RAG, Webhooks e RLS.
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- TABELAS PRINCIPAIS DO SISTEMA
-- ==============================================================================

-- 2. Tabela de Planos Comerciais (SaaS Plans e Planos de Orientação)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 9.90,
  price_annual NUMERIC(10,2) NOT NULL DEFAULT 99.00,
  max_tutors INTEGER NOT NULL DEFAULT 100,
  max_vets INTEGER NOT NULL DEFAULT 2,
  max_ai_tokens TEXT DEFAULT '500k tokens/mês',
  features JSONB DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de Clínicas / Instâncias Multi-Tenant (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  owner_name TEXT,
  email TEXT,
  phone TEXT,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  plan_name TEXT DEFAULT 'VetPro Starter',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  subscription_status TEXT DEFAULT 'ACTIVE',
  asaas_customer_id TEXT,       -- ID do cliente no gateway Asaas (ex: cus_0000058291)
  asaas_subscription_id TEXT,   -- ID da assinatura recorrente no Asaas (ex: sub_00000123)
  custom_prompt TEXT,           -- Prompt personalizado da clínica para IA
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Perfis de Usuários (Estende auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'tutor' CHECK (role IN ('super_admin', 'admin', 'veterinario', 'tutor')),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf_cnpj TEXT,
  
  -- Campos exclusivos para Médicos Veterinários:
  crmv TEXT,                    -- Ex: '12345'
  crmv_uf TEXT,                 -- Ex: 'SP', 'RJ', 'MG'
  crmv_validated BOOLEAN DEFAULT false,
  specialty TEXT,               -- Ex: 'Clínico Geral', 'Dermatologia', 'Fisiatria'
  
  -- Campos para Integração Financeira Asaas:
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'INACTIVE' CHECK (subscription_status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'OVERDUE')),
  plan_selected TEXT,           -- 'essencial' | 'especialista'
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Módulos e Recursos por Tenant (Feature Flags)
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  module_key TEXT NOT NULL,     -- 'mod-expert', 'mod-prescription', 'mod-whatsapp', 'mod-rag', 'mod-partners', etc.
  enabled BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, module_key)
);

-- 5.1 Tabela de Parceiros Comerciais, Rede Credenciada & GPS
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Clínica Veterinária', -- 'Clínica Veterinária', 'Pet Shop & Banho', 'Farmácia Veterinária', 'Laboratório', 'Hospital 24h'
  address TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  website TEXT,
  image_url TEXT,
  rating NUMERIC(3,2) DEFAULT 5.0,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  discount_coupon TEXT,
  benefits TEXT,
  latitude NUMERIC(10,8),
  longitude NUMERIC(11,8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Pets Cadastrados / Triados
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tutor_name TEXT,
  tutor_phone TEXT,
  name TEXT NOT NULL,
  species TEXT NOT NULL DEFAULT 'Cão', -- 'Cão', 'Gato', etc.
  breed TEXT,                         -- Ex: 'Golden Retriever', 'Siamês', 'SRD'
  sex TEXT,                           -- 'Macho' ou 'Fêmea'
  age TEXT,                           -- Ex: '3 anos', '5 meses'
  weight TEXT,                        -- Ex: '12 kg', '4.5 kg'
  microchip TEXT,
  symptoms TEXT,
  notes TEXT,
  image_url TEXT,
  last_triage_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Caderneta de Vacinação Digital do Pet (Integrada com WhatsApp)
CREATE TABLE IF NOT EXISTS public.pet_vaccines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  vaccine_name TEXT NOT NULL,
  application_date DATE,
  next_due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied', -- 'applied' (aplicada), 'scheduled' (agendada), 'overdue' (vencida)
  batch_number TEXT,                      -- Lote da vacina
  manufacturer TEXT,                      -- Laboratório (Ex: Zoetis, Boehringer, MSD, Virbac, Ceva)
  vet_name TEXT,                          -- Veterinário responsável pela aplicação
  vet_crmv TEXT,                          -- CRMV do veterinário
  notes TEXT,
  reminder_phone TEXT,                    -- WhatsApp do tutor para disparo do lembrete
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Histórico de Chats de Orientação & Triagem com IA
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  tutor_name TEXT,
  pet_name TEXT,
  species TEXT DEFAULT 'Cão',
  breed TEXT,
  sex TEXT,
  age TEXT,
  weight TEXT,
  triage_level TEXT DEFAULT 'verde' CHECK (triage_level IN ('verde', 'amarelo', 'vermelho')),
  summary TEXT,
  assigned_vet_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Mensagens Individuais de cada Atendimento / Triagem
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('tutor', 'ai', 'veterinario', 'system')),
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Configurações de IA (Provedor Gemini/OpenAI, Parâmetros e Prompts Clínicos)
CREATE TABLE IF NOT EXISTS public.ai_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
  provider TEXT DEFAULT 'gemini',        -- 'gemini' ou 'openai'
  model_name TEXT DEFAULT 'gemini-2.5-flash',
  temperature NUMERIC(2,1) DEFAULT 0.2,
  max_output_tokens INTEGER DEFAULT 2048,
  api_key TEXT,                          -- Chave de API customizada (opcional)
  system_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Base de Conhecimento RAG (Protocolos Clínicos, Manuais WSAVA e Bulários)
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Protocolos Clínicos',
  content TEXT NOT NULL,
  file_name TEXT,                        -- Ex: 'Diretrizes_WSAVA_Vacinacao.pdf'
  file_size BIGINT,                      -- Tamanho do arquivo em bytes
  file_type TEXT,                        -- Ex: 'application/pdf', 'text/plain'
  file_url TEXT,                         -- URL no Storage do Supabase ou Base64
  page_count INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Tabela de Logs de Webhooks (Asaas, Evolution WhatsApp e Pagamentos)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'asaas',  -- 'asaas' | 'evolution' | 'gateway'
  event_type TEXT NOT NULL,              -- Ex: 'PAYMENT_RECEIVED', 'SUBSCRIPTION_CREATED'
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Logs de Auditoria do Sistema e Ações Críticas
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                  -- Ex: 'CRMV_REGISTERED', 'MODULE_TOGGLED', 'SUBSCRIPTION_ACTIVE'
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================================================
-- CRIAÇÃO DE ÍNDICES PARA ALTA PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON public.user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_asaas_cust ON public.user_profiles(asaas_customer_id);

CREATE INDEX IF NOT EXISTS idx_pets_tenant ON public.pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_user ON public.pets(user_id);
CREATE INDEX IF NOT EXISTS idx_pets_tutor_phone ON public.pets(tutor_phone);

CREATE INDEX IF NOT EXISTS idx_pet_vaccines_pet_id ON public.pet_vaccines(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_vaccines_next_due ON public.pet_vaccines(next_due_date);
CREATE INDEX IF NOT EXISTS idx_pet_vaccines_status ON public.pet_vaccines(status);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_tenant ON public.chat_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_pet ON public.chat_sessions(pet_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON public.chat_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_tenant ON public.knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partners_tenant ON public.partners(tenant_id);
CREATE INDEX IF NOT EXISTS idx_partners_active_featured ON public.partners(is_active, is_featured);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON public.webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON public.webhook_logs(created_at DESC);

-- ==============================================================================
-- FUNÇÕES AUXILIARES E TRIGGERS
-- ==============================================================================

-- Função para Exclusão de Usuários do Auth (Security Definer)
CREATE OR REPLACE FUNCTION public.delete_user(user_id_to_delete UUID)
RETURNS void AS $$
BEGIN
  -- Apenas admins e super_admins podem excluir usuários
  IF NOT public.is_super_admin() AND NOT public.is_tenant_admin() THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem excluir usuários.';
  END IF;

  DELETE FROM auth.users WHERE id = user_id_to_delete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON public.tenants;
CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_pets_updated_at ON public.pets;
CREATE TRIGGER trg_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS trg_pet_vaccines_updated_at ON public.pet_vaccines;
CREATE TRIGGER trg_pet_vaccines_updated_at
  BEFORE UPDATE ON public.pet_vaccines
  FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- Trigger para criar perfil automaticamente no cadastro do Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  default_tenant UUID;
BEGIN
  -- Obter ou criar um tenant padrão se não existir
  SELECT id INTO default_tenant FROM public.tenants ORDER BY created_at ASC LIMIT 1;
  
  IF default_tenant IS NULL THEN
    INSERT INTO public.tenants (name, owner_name, email, plan_name)
    VALUES ('Clínica VetPro Orienta', COALESCE(NEW.raw_user_meta_data->>'full_name', 'Administrador'), NEW.email, 'VetPro Starter')
    RETURNING id INTO default_tenant;
  END IF;

  INSERT INTO public.user_profiles (
    id,
    tenant_id,
    full_name,
    email,
    phone,
    role
  ) VALUES (
    NEW.id,
    default_tenant,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'tutor')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_registration();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA E ISOLAMENTO
-- ==============================================================================

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Funções Helper para as Políticas de RLS
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_tenant_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. Planos (Leitura pública/autenticada, escrita apenas Super Admin)
DROP POLICY IF EXISTS "Qualquer autenticado vê os planos" ON public.plans;
CREATE POLICY "Qualquer autenticado vê os planos" ON public.plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Apenas Super Admin gerencia planos" ON public.plans;
CREATE POLICY "Apenas Super Admin gerencia planos" ON public.plans
  FOR ALL USING (public.is_super_admin());

-- 2. Tenants (Clínicas)
DROP POLICY IF EXISTS "Membros veem sua própria clínica" ON public.tenants;
CREATE POLICY "Membros veem sua própria clínica" ON public.tenants
  FOR SELECT USING (id = public.current_user_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "Super Admin gerencia todos os tenants" ON public.tenants;
CREATE POLICY "Super Admin gerencia todos os tenants" ON public.tenants
  FOR ALL USING (public.is_super_admin());

-- 3. Perfis de Usuários
DROP POLICY IF EXISTS "Usuários veem perfis da mesma clínica" ON public.user_profiles;
CREATE POLICY "Usuários veem perfis da mesma clínica" ON public.user_profiles
  FOR SELECT USING (tenant_id = public.current_user_tenant_id() OR id = auth.uid() OR public.is_super_admin());

DROP POLICY IF EXISTS "Admins gerenciam usuários da sua clínica" ON public.user_profiles;
CREATE POLICY "Admins gerenciam usuários da sua clínica" ON public.user_profiles
  FOR ALL USING (
    (tenant_id = public.current_user_tenant_id() AND public.is_tenant_admin()) 
    OR id = auth.uid()
    OR public.is_super_admin()
  );

-- 4. Pets
DROP POLICY IF EXISTS "Acesso aos pets do tenant" ON public.pets;
CREATE POLICY "Acesso aos pets do tenant" ON public.pets
  FOR ALL USING (
    user_id = auth.uid() OR 
    (tenant_id = public.current_user_tenant_id() AND (public.is_tenant_admin() OR public.is_super_admin())) OR 
    public.is_super_admin()
  );

-- 5. Caderneta de Vacinas
DROP POLICY IF EXISTS "Acesso às vacinas do tenant" ON public.pet_vaccines;
CREATE POLICY "Acesso às vacinas do tenant" ON public.pet_vaccines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pets p 
      WHERE p.id = pet_id AND (
        p.user_id = auth.uid() OR 
        (p.tenant_id = public.current_user_tenant_id() AND (public.is_tenant_admin() OR public.is_super_admin())) OR 
        public.is_super_admin()
      )
    )
  );

-- 6. Sessões de Chat e Mensagens
DROP POLICY IF EXISTS "Acesso aos chats do tenant" ON public.chat_sessions;
CREATE POLICY "Acesso aos chats do tenant" ON public.chat_sessions
  FOR ALL USING (
    user_id = auth.uid() OR 
    (tenant_id = public.current_user_tenant_id() AND (public.is_tenant_admin() OR public.is_super_admin())) OR 
    public.is_super_admin()
  );

DROP POLICY IF EXISTS "Acesso às mensagens da sessão" ON public.chat_messages;
CREATE POLICY "Acesso às mensagens da sessão" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = session_id AND (
        cs.user_id = auth.uid() OR 
        (cs.tenant_id = public.current_user_tenant_id() AND (public.is_tenant_admin() OR public.is_super_admin())) OR 
        public.is_super_admin()
      )
    )
  );

-- 7. Configurações de IA, Módulos e Base de Conhecimento
DROP POLICY IF EXISTS "Admins gerenciam IA do tenant" ON public.ai_settings;
CREATE POLICY "Admins gerenciam IA do tenant" ON public.ai_settings
  FOR ALL USING (
    (tenant_id = public.current_user_tenant_id() AND public.is_tenant_admin())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Admins gerenciam base de conhecimento" ON public.knowledge_base;
CREATE POLICY "Admins gerenciam base de conhecimento" ON public.knowledge_base
  FOR ALL USING (
    (tenant_id = public.current_user_tenant_id() AND public.is_tenant_admin())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS "Acesso aos módulos" ON public.tenant_modules;
CREATE POLICY "Acesso aos módulos" ON public.tenant_modules
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_super_admin()
  );

-- 7.1 Políticas para Parceiros e Anúncios Rotativos
DROP POLICY IF EXISTS "Todos podem visualizar parceiros ativos" ON public.partners;
CREATE POLICY "Todos podem visualizar parceiros ativos" ON public.partners
  FOR SELECT USING (is_active = true OR public.is_super_admin() OR public.is_tenant_admin());

DROP POLICY IF EXISTS "Apenas Super Admin gerencia parceiros" ON public.partners;
CREATE POLICY "Apenas Super Admin gerencia parceiros" ON public.partners
  FOR ALL USING (public.is_super_admin());

-- 8. Webhook Logs e Auditoria
DROP POLICY IF EXISTS "Admins veem logs de webhooks" ON public.webhook_logs;
CREATE POLICY "Admins veem logs de webhooks" ON public.webhook_logs
  FOR ALL USING (public.is_super_admin() OR public.is_tenant_admin());

DROP POLICY IF EXISTS "Admins veem logs de auditoria" ON public.audit_logs;
CREATE POLICY "Admins veem logs de auditoria" ON public.audit_logs
  FOR ALL USING (public.is_super_admin() OR public.is_tenant_admin());

-- ==============================================================================
-- DADOS INICIAIS E MIGRAÇÕES DE COMPATIBILIDADE
-- ==============================================================================

-- Garantir que todas as colunas necessárias existam em tabelas criadas previamente
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.pets ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

INSERT INTO public.plans (name, description, price_monthly, price_annual, max_tutors, max_vets, max_ai_tokens, is_popular)
VALUES 
  ('Plano Essencial', 'Orientação e triagem rápida por chat e WhatsApp', 9.90, 99.00, 100, 1, '500k tokens/mês', false),
  ('Plano Especialista', 'Atendimento humano especializado com médico-veterinário', 29.90, 299.00, 500, 5, '2M tokens/mês', true),
  ('VetPro Starter', 'Para clínicas iniciantes e veterinários autônomos', 199.00, 1890.00, 250, 2, '1M tokens/mês', false),
  ('VetPro Pro', 'Para clínicas veterinárias com alto fluxo de triagem', 399.00, 3790.00, 1000, 6, '3M tokens/mês', true),
  ('VetPro Enterprise', 'Para redes hospitalares e franqueadoras veterinárias', 799.00, 7590.00, 99999, 999, 'Ilimitado', false)
ON CONFLICT DO NOTHING;

-- Notificar PostgREST para recarregar o schema do banco instantaneamente
NOTIFY pgrst, 'reload schema';