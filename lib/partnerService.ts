import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export interface Partner {
  id: string;
  name: string;
  category: 'clinica' | 'hospital_24h' | 'pet_shop' | 'banho_tosa' | 'farmacia' | 'adestramento' | 'hotel_pet' | 'especialista';
  description?: string;
  logo_url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  address: string;
  neighborhood?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  is_featured: boolean; // se aparece nos anúncios rotativos em cards
  banner_badge?: string; // Ex: "Desconto Exclusivo", "Plantão 24h", "Parceiro Oficial", "Google Maps"
  promo_text?: string; // Ex: "10% de desconto na primeira consulta para clientes VetPro"
  rating?: number;
  reviews_count?: number;
  google_maps_url?: string;
  open_now?: boolean;
  source?: 'system' | 'google_maps';
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  // Propriedade dinâmica calculada com base na geolocalização do usuário
  distanceKm?: number;
}

export const PARTNER_CATEGORIES: { id: Partner['category']; label: string; iconName: string }[] = [
  { id: 'clinica', label: 'Clínica Veterinária', iconName: 'Stethoscope' },
  { id: 'hospital_24h', label: 'Hospital 24 Horas', iconName: 'Activity' },
  { id: 'farmacia', label: 'Farmácia Veterinária', iconName: 'Pill' },
  { id: 'pet_shop', label: 'Pet Shop & Acessórios', iconName: 'ShoppingBag' },
  { id: 'banho_tosa', label: 'Banho & Tosa / Estética', iconName: 'Sparkles' },
  { id: 'especialista', label: 'Especialista / Consultório', iconName: 'HeartPulse' },
  { id: 'adestramento', label: 'Adestramento & Comportamento', iconName: 'Award' },
  { id: 'hotel_pet', label: 'Hotel & Creche Pet', iconName: 'Home' },
];

// Sem mock fictício: a lista padrão começa limpa, preenchendo apenas com dados reais da região e cadastros oficiais
export const DEFAULT_PARTNERS: Partner[] = [];

const LOCAL_STORAGE_KEY = 'vetpro_partners_list';
const FAVORITES_STORAGE_KEY = 'vetpro_favorite_partners';

// Gerenciador de Favoritos do Tutor
export function getFavoritePartnerIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isPartnerFavorite(partnerId: string): boolean {
  const favs = getFavoritePartnerIds();
  return favs.includes(partnerId);
}

export function toggleFavoritePartner(partnerId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favs = getFavoritePartnerIds();
    let updated: string[];
    let isFav = false;
    if (favs.includes(partnerId)) {
      updated = favs.filter(id => id !== partnerId);
      isFav = false;
    } else {
      updated = [...favs, partnerId];
      isFav = true;
    }
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('vetpro_favorites_changed'));
    return isFav;
  } catch {
    return false;
  }
}

// Haversine formula para cálculo preciso de distância em quilômetros
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10; // Arredonda para 1 casa decimal
}

// Obter parceiros salvos localmente
export function getLocalPartners(): Partner[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

// Salvar parceiros localmente
export function saveLocalPartners(partners: Partner[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(partners));
  } catch (err) {
    console.error('Erro ao salvar parceiros localmente:', err);
  }
}

// Listar todos os parceiros com sincronização Supabase
export async function getPartners(): Promise<Partner[]> {
  const localPartners = getLocalPartners();
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        saveLocalPartners(data as Partner[]);
        return data as Partner[];
      }
    }
  } catch (err) {
    console.warn('Falha ao buscar parceiros do Supabase, carregando local:', err);
  }

  return localPartners;
}

export function resetDefaultPartners(): Partner[] {
  saveLocalPartners([]);
  return [];
}

export async function fetchGooglePlacesPartners(params: {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  category?: string;
  query?: string;
}): Promise<Partner[]> {
  try {
    const res = await fetch('/api/partners/google-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.places)) {
        return data.places;
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar parceiros via API:', err);
  }
  return [];
}

// Listar apenas parceiros ativos para exibição pública / tutor
export async function getActivePartners(
  userCoords?: { latitude: number; longitude: number } | null,
  options?: { address?: string; city?: string; state?: string; includeGooglePlaces?: boolean; category?: string; query?: string }
): Promise<Partner[]> {
  const all = await getPartners();
  let active = all.filter(p => p.status === 'active');

  // Se solicitado busca integrada via API de mapas/estabelecimentos
  let googlePlaces: Partner[] = [];
  if (options?.includeGooglePlaces) {
    googlePlaces = await fetchGooglePlacesPartners({
      latitude: userCoords?.latitude,
      longitude: userCoords?.longitude,
      address: options.address,
      city: options.city,
      state: options.state,
      category: options.category,
      query: options.query,
    });
  }

  // Mescla parceiros oficiais cadastrados + resultados reais da região
  const existingIds = new Set(active.map(p => p.id));
  const uniquePlaces = googlePlaces.filter(p => !existingIds.has(p.id));
  let mergedList = [...active, ...uniquePlaces];

  if (userCoords && userCoords.latitude && userCoords.longitude) {
    mergedList = mergedList.map(partner => {
      if (partner.latitude && partner.longitude) {
        const dist = calculateDistanceKm(
          userCoords.latitude,
          userCoords.longitude,
          partner.latitude,
          partner.longitude
        );
        return { ...partner, distanceKm: dist };
      }
      return partner;
    });

    // Ordenar primeiro os mais próximos
    mergedList.sort((a, b) => {
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      if (a.distanceKm !== undefined) return -1;
      if (b.distanceKm !== undefined) return 1;
      return 0;
    });
  }

  return mergedList;
}

// Listar parceiros com anúncios rotativos ativos
export async function getFeaturedAdPartners(userCoords?: { latitude: number; longitude: number } | null): Promise<Partner[]> {
  const active = await getActivePartners(userCoords);
  const featured = active.filter(p => p.is_featured);
  if (featured.length > 0) return featured;
  return active;
}

// Criar ou atualizar parceiro
export async function savePartner(partner: Partial<Partner> & { name: string; category: Partner['category']; address: string; city: string; state: string }): Promise<{ success: boolean; data?: Partner; error?: string }> {
  try {
    const isNew = !partner.id;
    const now = new Date().toISOString();
    const partnerToSave: Partner = {
      id: partner.id || `partner-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: partner.name.trim(),
      category: partner.category,
      description: partner.description || '',
      logo_url: partner.logo_url || '',
      phone: partner.phone || '',
      whatsapp: partner.whatsapp || '',
      email: partner.email || '',
      website: partner.website || '',
      instagram: partner.instagram || '',
      address: partner.address.trim(),
      neighborhood: partner.neighborhood || '',
      city: partner.city.trim(),
      state: partner.state.trim().toUpperCase(),
      latitude: partner.latitude,
      longitude: partner.longitude,
      is_featured: partner.is_featured ?? true,
      banner_badge: partner.banner_badge || 'Parceiro Credenciado',
      promo_text: partner.promo_text || '',
      rating: partner.rating || 5.0,
      status: partner.status || 'active',
      created_at: partner.created_at || now,
      updated_at: now,
    };

    // 1. Salvar no Supabase se configurado
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('partners')
          .upsert(partnerToSave)
          .select()
          .single();

        if (error) {
          console.warn('Erro ao salvar parceiro no Supabase:', error.message);
        } else if (data) {
          const currentList = getLocalPartners();
          const filtered = currentList.filter(p => p.id !== partnerToSave.id);
          saveLocalPartners([data as Partner, ...filtered]);
          return { success: true, data: data as Partner };
        }
      } catch (e) {
        console.warn('Exceção Supabase ao salvar parceiro:', e);
      }
    }

    // 2. Persistir localmente
    const currentList = getLocalPartners();
    const filtered = currentList.filter(p => p.id !== partnerToSave.id);
    const updated = [partnerToSave, ...filtered];
    saveLocalPartners(updated);

    return { success: true, data: partnerToSave };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao processar dados do parceiro.' };
  }
}

// Excluir parceiro com auditoria
export async function deletePartner(partnerId: string, partnerName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      await supabase.from('partners').delete().eq('id', partnerId);

      await supabase.from('audit_logs').insert({
        action: 'PARTNER_DELETED',
        details: { partner_id: partnerId, partner_name: partnerName || 'Parceiro', timestamp: new Date().toISOString() }
      });
    }
    const current = getLocalPartners();
    const updated = current.filter(p => p.id !== partnerId);
    saveLocalPartners(updated);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir parceiro.' };
  }
}
