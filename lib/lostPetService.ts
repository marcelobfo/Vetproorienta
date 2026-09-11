import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { calculateDistanceKm } from '@/lib/partnerService';

export interface LostPetRecord {
  id: string;
  tenant_id?: string;
  user_id?: string;
  pet_id?: string;
  pet_name: string;
  species: 'Cão' | 'Gato' | 'Pássaro' | 'Outro';
  breed?: string;
  color?: string;
  gender?: 'Macho' | 'Fêmea' | 'Indefinido';
  size?: 'Pequeno' | 'Médio' | 'Grande' | 'Porte Gigante';
  has_collar?: boolean;
  collar_description?: string;
  microchip?: string;
  reward_amount?: number;
  reward_description?: string;
  photo_url?: string;
  distinguishing_marks?: string;
  status: 'lost' | 'spotted' | 'found' | 'reunited';
  last_seen_date: string;
  last_seen_time?: string;
  last_seen_street?: string;
  last_seen_number?: string;
  last_seen_neighborhood: string;
  last_seen_city: string;
  last_seen_state: string;
  last_seen_postal_code?: string;
  last_seen_reference_point?: string;
  alert_radius_km: number;
  latitude?: number;
  longitude?: number;
  contact_name: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email?: string;
  description?: string;
  views_count?: number;
  sightings_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface LostPetSighting {
  id: string;
  lost_pet_id: string;
  user_id?: string;
  reporter_name: string;
  reporter_phone: string;
  sighting_date: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  description: string;
  photo_url?: string;
  created_at: string;
}

export interface TutorLocationRef {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

const LOST_PETS_STORAGE_KEY = 'vetpro_lost_pets';
const SIGHTINGS_STORAGE_KEY = 'vetpro_lost_pet_sightings';

// Coordenadas aproximadas de cidades polo
const CITY_COORDS_MAP: Record<string, { latitude: number; longitude: number }> = {
  'montes claros': { latitude: -16.7282, longitude: -43.8578 },
  'belo horizonte': { latitude: -19.9167, longitude: -43.9345 },
  'uberlandia': { latitude: -18.9186, longitude: -48.2772 },
  'uberlândia': { latitude: -18.9186, longitude: -48.2772 },
  'juiz de fora': { latitude: -21.7587, longitude: -43.3496 },
  'sao paulo': { latitude: -23.5505, longitude: -46.6333 },
  'são paulo': { latitude: -23.5505, longitude: -46.6333 },
  'campinas': { latitude: -22.9056, longitude: -47.0608 },
  'rio de janeiro': { latitude: -22.9068, longitude: -43.1729 },
  'niteroi': { latitude: -22.8833, longitude: -43.1039 },
  'niterói': { latitude: -22.8833, longitude: -43.1039 },
  'brasilia': { latitude: -15.7975, longitude: -47.8919 },
  'brasília': { latitude: -15.7975, longitude: -47.8919 },
  'curitiba': { latitude: -25.4284, longitude: -49.2733 },
  'salvador': { latitude: -12.9777, longitude: -38.5016 },
  'porto alegre': { latitude: -30.0346, longitude: -51.2177 },
  'recife': { latitude: -8.0476, longitude: -34.8770 },
  'fortaleza': { latitude: -3.7319, longitude: -38.5267 },
  'goiania': { latitude: -16.6869, longitude: -49.2648 },
  'goiânia': { latitude: -16.6869, longitude: -49.2648 },
};

// Registros iniciais padrão para demonstração instantânea do radar comunitário
export const INITIAL_LOST_PETS: LostPetRecord[] = [
  {
    id: 'lost-pet-demo-1',
    pet_name: 'Thor',
    species: 'Cão',
    breed: 'Golden Retriever',
    color: 'Dourado claro',
    gender: 'Macho',
    size: 'Grande',
    has_collar: true,
    collar_description: 'Coleira vermelha com pingente de osso e plaquinha com telefone',
    reward_amount: 500,
    reward_description: 'Recompensa de R$ 500 para quem encontrá-lo ou der pista confirmada',
    photo_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80',
    distinguishing_marks: 'Manchinha branca no peito e muito dócil',
    status: 'lost',
    last_seen_date: new Date(Date.now() - 24 * 3600 * 1000).toISOString().split('T')[0],
    last_seen_time: '16:30',
    last_seen_street: 'Av. Deputado Esteves Rodrigues',
    last_seen_neighborhood: 'Centro / Todos os Santos',
    last_seen_city: 'Montes Claros',
    last_seen_state: 'MG',
    last_seen_reference_point: 'Próximo à Praça dos Jatobás e Parque Ibituruna',
    alert_radius_km: 15,
    latitude: -16.7265,
    longitude: -43.8640,
    contact_name: 'Ana Paula Silva',
    contact_phone: '(38) 99876-5432',
    contact_whatsapp: '38998765432',
    contact_email: 'anapaula@gmail.com',
    description: 'Thor se assustou com fogos de artifício e saiu correndo em direção à praça. Ele é muito brincalhão mas pode estar assustado.',
    views_count: 84,
    sightings_count: 2,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'lost-pet-demo-2',
    pet_name: 'Mia',
    species: 'Gato',
    breed: 'Siamês',
    color: 'Branco com extremidades escuras',
    gender: 'Fêmea',
    size: 'Pequeno',
    has_collar: false,
    reward_amount: 200,
    photo_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
    distinguishing_marks: 'Olhos azuis muito vivos e rabo com pontinha escura',
    status: 'lost',
    last_seen_date: new Date(Date.now() - 48 * 3600 * 1000).toISOString().split('T')[0],
    last_seen_time: '20:15',
    last_seen_street: 'Rua Santa Maria',
    last_seen_neighborhood: 'Ibituruna',
    last_seen_city: 'Montes Claros',
    last_seen_state: 'MG',
    last_seen_reference_point: 'Perto do condomínio Morada da Serra',
    alert_radius_km: 10,
    latitude: -16.7350,
    longitude: -43.8710,
    contact_name: 'Carlos Eduardo',
    contact_phone: '(38) 98765-4321',
    contact_whatsapp: '38987654321',
    description: 'Mia pulou a janela do apartamento. É castrada e mansa, mas costuma miar quando tem fome.',
    views_count: 52,
    sightings_count: 1,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
  }
];

/**
 * Obtém todos os alertas de pets perdidos
 */
export async function getAllLostPets(): Promise<LostPetRecord[]> {
  let list: LostPetRecord[] = [];

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('lost_pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        list = data.map((d: any) => ({
          ...d,
          alert_radius_km: Number(d.alert_radius_km) || 10,
          reward_amount: Number(d.reward_amount) || 0,
        }));
      }
    } catch (e) {
      console.warn('Erro ao carregar pets perdidos do Supabase:', e);
    }
  }

  if (list.length === 0 && typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOST_PETS_STORAGE_KEY);
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch {
        list = [];
      }
    }
    if (list.length === 0) {
      list = [...INITIAL_LOST_PETS];
      localStorage.setItem(LOST_PETS_STORAGE_KEY, JSON.stringify(list));
    }
  }

  return list;
}

/**
 * Salva ou atualiza um alerta de pet perdido
 */
export async function saveLostPet(
  petData: Partial<LostPetRecord>
): Promise<{ success: boolean; data?: LostPetRecord; error?: string }> {
  try {
    const id = petData.id || `lost-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const nowIso = new Date().toISOString();

    // Resolver coordenadas se não fornecidas
    let lat = petData.latitude;
    let lng = petData.longitude;
    if ((!lat || !lng) && petData.last_seen_city) {
      const cityKey = petData.last_seen_city.toLowerCase().trim();
      if (CITY_COORDS_MAP[cityKey]) {
        lat = CITY_COORDS_MAP[cityKey].latitude;
        lng = CITY_COORDS_MAP[cityKey].longitude;
      }
    }

    const record: LostPetRecord = {
      id,
      tenant_id: petData.tenant_id,
      user_id: petData.user_id,
      pet_id: petData.pet_id,
      pet_name: petData.pet_name || 'Pet Sem Nome',
      species: petData.species || 'Cão',
      breed: petData.breed || 'SRD / Mestiço',
      color: petData.color || 'Não especificada',
      gender: petData.gender || 'Indefinido',
      size: petData.size || 'Médio',
      has_collar: Boolean(petData.has_collar),
      collar_description: petData.collar_description || '',
      microchip: petData.microchip || '',
      reward_amount: petData.reward_amount ? Number(petData.reward_amount) : 0,
      reward_description: petData.reward_description || '',
      photo_url: petData.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
      distinguishing_marks: petData.distinguishing_marks || '',
      status: petData.status || 'lost',
      last_seen_date: petData.last_seen_date || nowIso.split('T')[0],
      last_seen_time: petData.last_seen_time || '12:00',
      last_seen_street: petData.last_seen_street || '',
      last_seen_number: petData.last_seen_number || '',
      last_seen_neighborhood: petData.last_seen_neighborhood || 'Bairro Principal',
      last_seen_city: petData.last_seen_city || 'Montes Claros',
      last_seen_state: petData.last_seen_state || 'MG',
      last_seen_postal_code: petData.last_seen_postal_code || '',
      last_seen_reference_point: petData.last_seen_reference_point || '',
      alert_radius_km: petData.alert_radius_km ? Number(petData.alert_radius_km) : 10,
      latitude: lat,
      longitude: lng,
      contact_name: petData.contact_name || 'Tutor Responsável',
      contact_phone: petData.contact_phone || '',
      contact_whatsapp: (petData.contact_whatsapp || petData.contact_phone || '').replace(/\D/g, ''),
      contact_email: petData.contact_email || '',
      description: petData.description || '',
      views_count: petData.views_count || 0,
      sightings_count: petData.sightings_count || 0,
      created_at: petData.created_at || nowIso,
      updated_at: nowIso,
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.from('lost_pets').upsert(record, { onConflict: 'id' });
        if (error) {
          console.warn('Erro ao salvar pet perdido no Supabase:', error);
        }
      } catch (e) {
        console.warn('Exceção ao persistir no Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOST_PETS_STORAGE_KEY);
      let all: LostPetRecord[] = raw ? JSON.parse(raw) : [];
      const idx = all.findIndex(p => p.id === record.id);
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.unshift(record);
      }
      localStorage.setItem(LOST_PETS_STORAGE_KEY, JSON.stringify(all));
      window.dispatchEvent(new CustomEvent('vetpro_lost_pets_updated', { detail: record }));
    }

    return { success: true, data: record };
  } catch (err: any) {
    console.error('Erro ao salvar pet perdido:', err);
    return { success: false, error: err.message || 'Erro ao registrar pet perdido.' };
  }
}

/**
 * Atualiza o status do pet (ex: marcar como 'reunited' ou 'found' quando for resgatado)
 */
export async function updateLostPetStatus(
  id: string,
  status: 'lost' | 'spotted' | 'found' | 'reunited'
): Promise<{ success: boolean; error?: string }> {
  try {
    const all = await getAllLostPets();
    const pet = all.find(p => p.id === id);
    if (!pet) return { success: false, error: 'Alerta não encontrado' };

    const updated = {
      ...pet,
      status,
      updated_at: new Date().toISOString()
    };

    return await saveLostPet(updated);
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao atualizar status' };
  }
}

/**
 * Exclui um alerta de pet perdido
 */
export async function deleteLostPet(id: string): Promise<{ success: boolean }> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('lost_pets').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar pet perdido no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOST_PETS_STORAGE_KEY);
    if (raw) {
      const all: LostPetRecord[] = JSON.parse(raw);
      const filtered = all.filter(p => p.id !== id);
      localStorage.setItem(LOST_PETS_STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('vetpro_lost_pets_updated'));
    }
  }

  return { success: true };
}

/**
 * Envia uma pista / avistamento de pet perdido
 */
export async function submitPetSighting(
  sighting: Partial<LostPetSighting>
): Promise<{ success: boolean; data?: LostPetSighting; error?: string }> {
  try {
    const id = sighting.id || `sighting-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const record: LostPetSighting = {
      id,
      lost_pet_id: sighting.lost_pet_id || '',
      user_id: sighting.user_id,
      reporter_name: sighting.reporter_name || 'Comunidade VetPro',
      reporter_phone: sighting.reporter_phone || '',
      sighting_date: sighting.sighting_date || new Date().toISOString(),
      street: sighting.street || '',
      neighborhood: sighting.neighborhood || '',
      city: sighting.city || '',
      latitude: sighting.latitude,
      longitude: sighting.longitude,
      description: sighting.description || 'Pet avistado na região.',
      photo_url: sighting.photo_url || '',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('lost_pet_sightings').insert(record);
      } catch (e) {
        console.warn('Erro ao salvar avistamento no Supabase:', e);
      }
    }

    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(SIGHTINGS_STORAGE_KEY);
      const all: LostPetSighting[] = raw ? JSON.parse(raw) : [];
      all.unshift(record);
      localStorage.setItem(SIGHTINGS_STORAGE_KEY, JSON.stringify(all));

      // Atualiza contador de pistas no pet
      const allPets = await getAllLostPets();
      const pet = allPets.find(p => p.id === record.lost_pet_id);
      if (pet) {
        pet.sightings_count = (pet.sightings_count || 0) + 1;
        pet.status = pet.status === 'lost' ? 'spotted' : pet.status;
        await saveLostPet(pet);
      }
    }

    return { success: true, data: record };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar avistamento.' };
  }
}

/**
 * Filtra e calcula os alertas que estão DENTRO DO RAIO do endereço / localização do Tutor
 * Faz o cruzamento por:
 * 1. Distância em KM (se houver coordenadas latitude/longitude do tutor e do pet)
 * 2. Mesma Cidade e/ou Bairro (se não houver coordenadas precisas)
 */
export async function getLostPetsInTutorRadius(
  tutorLocation?: TutorLocationRef | null
): Promise<Array<LostPetRecord & { distanceKm?: number; isWithinRadius: boolean; matchReason: string }>> {
  const allPets = await getAllLostPets();
  // Apenas alertas ativos
  const activeLostPets = allPets.filter(p => p.status === 'lost' || p.status === 'spotted');

  // Coordenadas efetivas do tutor
  let tutorLat = tutorLocation?.latitude;
  let tutorLng = tutorLocation?.longitude;

  if ((!tutorLat || !tutorLng) && tutorLocation?.city) {
    const cityKey = tutorLocation.city.toLowerCase().trim();
    if (CITY_COORDS_MAP[cityKey]) {
      tutorLat = CITY_COORDS_MAP[cityKey].latitude;
      tutorLng = CITY_COORDS_MAP[cityKey].longitude;
    }
  }

  // Se o tutor não tiver cidade cadastrada, usamos Montes Claros como centro padrão para teste ou pegamos do IP/GPS
  if (!tutorLat || !tutorLng) {
    tutorLat = -16.7282;
    tutorLng = -43.8578;
  }

  const tutorCityLower = (tutorLocation?.city || 'Montes Claros').toLowerCase().trim();
  const tutorBairroLower = (tutorLocation?.neighborhood || '').toLowerCase().trim();
  const tutorRuaLower = (tutorLocation?.street || '').toLowerCase().trim();

  return activeLostPets.map(pet => {
    let distanceKm: number | undefined = undefined;
    let isWithinRadius = false;
    let matchReason = '';

    const petLat = pet.latitude || (CITY_COORDS_MAP[pet.last_seen_city.toLowerCase().trim()]?.latitude);
    const petLng = pet.longitude || (CITY_COORDS_MAP[pet.last_seen_city.toLowerCase().trim()]?.longitude);

    if (tutorLat && tutorLng && petLat && petLng) {
      distanceKm = calculateDistanceKm(tutorLat, tutorLng, petLat, petLng);
      const maxRadius = pet.alert_radius_km || 15;

      if (distanceKm <= maxRadius) {
        isWithinRadius = true;
        matchReason = `A cerca de ${distanceKm.toFixed(1)} km do seu endereço (Raio de ${maxRadius} km)`;
      }
    }

    const petCityLower = pet.last_seen_city.toLowerCase().trim();
    const petBairroLower = pet.last_seen_neighborhood.toLowerCase().trim();

    // Verificação textual por Bairro / Rua / Cidade
    if (!isWithinRadius) {
      if (tutorBairroLower && petBairroLower && (tutorBairroLower.includes(petBairroLower) || petBairroLower.includes(tutorBairroLower))) {
        isWithinRadius = true;
        matchReason = `Visto no seu mesmo bairro: ${pet.last_seen_neighborhood}`;
      } else if (tutorCityLower && petCityLower && tutorCityLower === petCityLower) {
        isWithinRadius = true;
        matchReason = `Visto na sua cidade: ${pet.last_seen_city} (${pet.last_seen_neighborhood})`;
      }
    }

    return {
      ...pet,
      distanceKm,
      isWithinRadius,
      matchReason: matchReason || `Região de ${pet.last_seen_city}`
    };
  }).filter(p => p.isWithinRadius);
}
