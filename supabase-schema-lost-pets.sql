-- ==============================================================================
-- SCHEMA SQL COMPLETO: RADAR DE PETS PERDIDOS & ALERTA COMUNITÁRIO POR RAIO
-- VetPro Multi-Tenant SaaS
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE PETS PERDIDOS / DESAPARECIDOS
CREATE TABLE IF NOT EXISTS public.lost_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Características do Animal
    pet_name TEXT NOT NULL,
    species TEXT NOT NULL DEFAULT 'Cão' CHECK (species IN ('Cão', 'Gato', 'Pássaro', 'Outro')),
    breed TEXT,
    color TEXT,
    gender TEXT DEFAULT 'Macho' CHECK (gender IN ('Macho', 'Fêmea', 'Indefinido')),
    size TEXT DEFAULT 'Médio' CHECK (size IN ('Pequeno', 'Médio', 'Grande', 'Porte Gigante')),
    has_collar BOOLEAN DEFAULT false,
    collar_description TEXT,
    microchip TEXT,
    reward_amount NUMERIC(10,2) DEFAULT 0.00,
    photo_url TEXT,
    distinguishing_marks TEXT,
    description TEXT,

    -- Status do Pet
    status TEXT NOT NULL DEFAULT 'lost' CHECK (status IN ('lost', 'spotted', 'found', 'reunited')),

    -- Local Onde Foi Visto Pela Última Vez & Raio de Notificação
    last_seen_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_seen_time TEXT,
    last_seen_street TEXT,
    last_seen_neighborhood TEXT NOT NULL,
    last_seen_city TEXT NOT NULL,
    last_seen_state VARCHAR(2) NOT NULL DEFAULT 'MG',
    last_seen_postal_code TEXT,
    last_seen_reference_point TEXT,
    last_seen_latitude DOUBLE PRECISION,
    last_seen_longitude DOUBLE PRECISION,
    alert_radius_km INTEGER NOT NULL DEFAULT 15,

    -- Contatos do Tutor Responsável
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_whatsapp TEXT NOT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE AVISTAMENTOS / PISTAS COMUNITÁRIAS ENVIADAS POR OUTROS TUTORES
CREATE TABLE IF NOT EXISTS public.lost_pet_sightings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lost_pet_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reporter_name TEXT NOT NULL,
    reporter_phone TEXT NOT NULL,
    sighted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    street TEXT,
    neighborhood TEXT,
    city TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    description TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ÍNDICES DE PERFORMANCE PARA BUSCA ESPACIAL E FILTRAGEM RÁPIDA
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON public.lost_pets(status);
CREATE INDEX IF NOT EXISTS idx_lost_pets_city_neighborhood ON public.lost_pets(last_seen_city, last_seen_neighborhood);
CREATE INDEX IF NOT EXISTS idx_lost_pets_lat_lng ON public.lost_pets(last_seen_latitude, last_seen_longitude);
CREATE INDEX IF NOT EXISTS idx_lost_pets_user_id ON public.lost_pets(user_id);
CREATE INDEX IF NOT EXISTS idx_lost_pets_created_at ON public.lost_pets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lost_pet_sightings_pet_id ON public.lost_pet_sightings(lost_pet_id);

-- 4. TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE updated_at
CREATE OR REPLACE FUNCTION update_lost_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lost_pets_updated_at ON public.lost_pets;
CREATE TRIGGER trigger_lost_pets_updated_at
BEFORE UPDATE ON public.lost_pets
FOR EACH ROW
EXECUTE FUNCTION update_lost_pets_updated_at();

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.lost_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_pet_sightings ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura Pública / Tutores: Todos podem visualizar alertas ativos
DROP POLICY IF EXISTS "Todos podem visualizar pets perdidos" ON public.lost_pets;
CREATE POLICY "Todos podem visualizar pets perdidos" ON public.lost_pets
    FOR SELECT USING (true);

-- Políticas de Inserção: Usuários autenticados ou anônimos com rate-limit podem cadastrar
DROP POLICY IF EXISTS "Usuários podem cadastrar pets perdidos" ON public.lost_pets;
CREATE POLICY "Usuários podem cadastrar pets perdidos" ON public.lost_pets
    FOR INSERT WITH CHECK (true);

-- Políticas de Edição: Apenas o dono ou admins podem atualizar
DROP POLICY IF EXISTS "Donos e Admins podem atualizar pets perdidos" ON public.lost_pets;
CREATE POLICY "Donos e Admins podem atualizar pets perdidos" ON public.lost_pets
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'veterinarian'))
    );

-- Políticas de Exclusão
DROP POLICY IF EXISTS "Donos e Admins podem deletar pets perdidos" ON public.lost_pets;
CREATE POLICY "Donos e Admins podem deletar pets perdidos" ON public.lost_pets
    FOR DELETE USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Políticas para Sightings (Pistas)
DROP POLICY IF EXISTS "Todos podem ver avistamentos" ON public.lost_pet_sightings;
CREATE POLICY "Todos podem ver avistamentos" ON public.lost_pet_sightings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Qualquer tutor pode enviar avistamento" ON public.lost_pet_sightings;
CREATE POLICY "Qualquer tutor pode enviar avistamento" ON public.lost_pet_sightings
    FOR INSERT WITH CHECK (true);

-- 6. RECARREGAR O SCHEMA DO POSTGREST
NOTIFY pgrst, 'reload schema';
