import { getSupabaseClient, isSupabaseConfigured } from './supabase';
import { callEvolutionProxy, getEvolutionConfig, cleanErrorMessage } from './evolution';

export interface PetRecord {
  id: string;
  tenant_id?: string;
  user_id?: string;
  tutor_name?: string;
  tutor_phone?: string;
  name: string;
  species: 'Cão' | 'Gato' | string;
  breed?: string;
  sex?: 'Macho' | 'Fêmea' | string;
  age?: string;
  weight?: string;
  microchip?: string;
  symptoms?: string;
  notes?: string;
  image_url?: string;
  last_triage_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PetVaccineRecord {
  id: string;
  tenant_id?: string;
  pet_id: string;
  vaccine_name: string;
  application_date?: string;
  next_due_date: string;
  status: 'applied' | 'scheduled' | 'overdue';
  batch_number?: string;
  manufacturer?: string;
  vet_name?: string;
  vet_crmv?: string;
  notes?: string;
  reminder_phone?: string;
  reminder_sent?: boolean;
  reminder_sent_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessageRecord {
  id: string;
  session_id?: string;
  role: 'user' | 'model';
  content: string;
  image_url?: string;
  created_at?: string;
}

export interface ChatSessionRecord {
  id: string;
  tenant_id?: string;
  user_id?: string;
  pet_id?: string;
  tutor_name?: string;
  pet_name?: string;
  species?: string;
  breed?: string;
  sex?: string;
  age?: string;
  weight?: string;
  triage_level?: 'verde' | 'amarelo' | 'vermelho';
  summary?: string;
  messages: ChatMessageRecord[];
  created_at: string;
  updated_at: string;
}

export const VACCINE_PRESETS = {
  dog: [
    { name: 'V10 (Polivalente Canina Quíntupla/Décupla)', manufacturer: 'Zoetis / Vanguard', defaultIntervalDays: 365, desc: 'Proteção contra Cinomose, Parvovirose, Hepatite, Leptospirose, Coronavirose e Parainfluenza.' },
    { name: 'V8 (Polivalente Quádrupla Canina)', manufacturer: 'Boehringer Ingelheim', defaultIntervalDays: 365, desc: 'Protege contra as principais viroses caninas e leptospirose.' },
    { name: 'Antirrábica Canina (Raiva)', manufacturer: 'MSD / Defensor', defaultIntervalDays: 365, desc: 'Obrigatória por lei. Protege contra o vírus da raiva canina.' },
    { name: 'Gripe Canina (Tosse dos Canis / Bronchiguard / Pneumodog)', manufacturer: 'Zoetis / Boehringer', defaultIntervalDays: 365, desc: 'Prevenção contra Bordetella bronchiseptica e gripe canina.' },
    { name: 'Giardíase (GiardiaVax)', manufacturer: 'Zoetis', defaultIntervalDays: 365, desc: 'Auxilia na prevenção da doença clínica da giardíase e reduz excreção de cistos.' },
    { name: 'Leishmaniose Canina (Leish-Tec)', manufacturer: 'Ceva Saúde Animal', defaultIntervalDays: 365, desc: 'Prevenção contra leishmaniose visceral canina em áreas endêmicas.' }
  ],
  cat: [
    { name: 'V4 (Quádrupla Felina)', manufacturer: 'Boehringer / Felocell', defaultIntervalDays: 365, desc: 'Proteção contra Panleucopenia, Rinotraqueíte, Calicivirose e Clamidiose felina.' },
    { name: 'V5 (Quíntupla Felina com FeLV)', manufacturer: 'Zoetis / Fel-O-Vax', defaultIntervalDays: 365, desc: 'Protege contra as 4 viroses clássicas + Vírus da Leucemia Felina (FeLV).' },
    { name: 'Antirrábica Felina (Raiva)', manufacturer: 'MSD / Rabisin', defaultIntervalDays: 365, desc: 'Proteção essencial e anual contra o vírus da raiva em felinos.' },
    { name: 'V3 (Tríplice Felina)', manufacturer: 'MSD Animal Health', defaultIntervalDays: 365, desc: 'Proteção essencial: Panleucopenia, Rinotraqueíte e Calicivirose.' }
  ]
};

const LOCAL_STORAGE_KEY = 'vetpro_pets';
const VACCINES_STORAGE_KEY = 'vetpro_pet_vaccines';
const CHAT_SESSIONS_STORAGE_KEY = 'vetpro_chat_sessions';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Carrega os pets com isolamento estrito por usuário/tutor e mesclagem resiliente
 */
export async function getSavedPets(filterUserId?: string): Promise<PetRecord[]> {
  let localPets: PetRecord[] = [];
  let targetUserId = filterUserId;

  // 1. Carregar pets do LocalStorage
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localPets = parsed;
        }
      } catch {
        localPets = [];
      }
    }
  }

  // 2. Identificar usuário logado se filterUserId não foi explicitado
  let currentSessionUserId = '';
  let currentUserRole = 'tutor';
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        currentSessionUserId = session.user.id;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role) {
          currentUserRole = profile.role;
        }

        if (!targetUserId) {
          if (currentUserRole === 'tutor') {
            targetUserId = session.user.id;
          }
        }
      }
    } catch {
      // continua
    }
  }

  // 3. Buscar do Supabase se configurado
  let dbPets: PetRecord[] = [];
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('pets')
        .select('*')
        .order('created_at', { ascending: false });

      if (targetUserId && targetUserId !== 'all') {
        query = query.eq('user_id', targetUserId);
      }

      const { data, error } = await query;

      if (!error && data && Array.isArray(data)) {
        dbPets = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id,
          user_id: d.user_id,
          tutor_name: d.tutor_name,
          tutor_phone: d.tutor_phone,
          name: d.name,
          species: d.species || 'Cão',
          breed: d.breed || 'SRD',
          sex: d.sex || 'Não informado',
          age: d.age || 'Não informada',
          weight: d.weight || 'Não informado',
          microchip: d.microchip,
          symptoms: d.symptoms,
          notes: d.notes,
          image_url: d.image_url || '',
          last_triage_at: d.last_triage_at || d.created_at,
          created_at: d.created_at,
          updated_at: d.updated_at
        }));
      }
    } catch (e) {
      console.warn('Erro ao consultar pets no Supabase:', e);
    }
  }

  // 4. Mesclar LocalStorage e Supabase de forma segura sem perder pets
  const petMap = new Map<string, PetRecord>();

  // Inserir primeiro os do LocalStorage
  localPets.forEach(p => {
    if (p && p.id) {
      petMap.set(p.id, p);
    }
  });

  // Mesclar com os do Supabase (mantendo image_url se já existia no local)
  dbPets.forEach(p => {
    if (p && p.id) {
      const local = petMap.get(p.id);
      petMap.set(p.id, {
        ...local,
        ...p,
        image_url: p.image_url || local?.image_url || '',
      });
    }
  });

  let mergedPets = Array.from(petMap.values());

  // 5. Filtragem consistente por tutor se solicitado ou se usuário logado for tutor
  if (targetUserId && targetUserId !== 'all') {
    mergedPets = mergedPets.filter(p => p.user_id === targetUserId || (currentSessionUserId && p.user_id === currentSessionUserId));
  } else if (currentSessionUserId && currentUserRole === 'tutor') {
    mergedPets = mergedPets.filter(p => p.user_id === currentSessionUserId);
  }

  // Ordenar decrescente por updated_at / created_at
  mergedPets.sort((a, b) => {
    const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
    const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
    return timeB - timeA;
  });

  // Atualizar LocalStorage com o conjunto mesclado mantendo integridade
  if (typeof window !== 'undefined' && mergedPets.length > 0) {
    try {
      // Mescla com o armazenamento global sem apagar pets de outros perfis
      const rawCurrent = localStorage.getItem(LOCAL_STORAGE_KEY);
      let existingAll: PetRecord[] = [];
      if (rawCurrent) {
        try { existingAll = JSON.parse(rawCurrent); } catch { existingAll = []; }
      }
      const existingMap = new Map<string, PetRecord>();
      existingAll.forEach(p => { if (p?.id) existingMap.set(p.id, p); });
      mergedPets.forEach(p => { if (p?.id) existingMap.set(p.id, p); });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(existingMap.values())));
    } catch {
      // continua
    }
  }

  return mergedPets;
}

/**
 * Salva ou atualiza um pet no banco de dados e no LocalStorage
 */
export async function savePetRecord(pet: Partial<PetRecord>): Promise<{ success: boolean; data?: PetRecord; error?: string }> {
  try {
    let resolvedUserId = pet.user_id;
    let resolvedTenantId = pet.tenant_id;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          if (!resolvedUserId) {
            resolvedUserId = session.user.id;
          }
          // Obter tenant_id do usuário logado se não fornecido
          if (!resolvedTenantId) {
            const { data: userProf } = await supabase
              .from('user_profiles')
              .select('tenant_id')
              .eq('id', session.user.id)
              .maybeSingle();
            if (userProf?.tenant_id) {
              resolvedTenantId = userProf.tenant_id;
            }
          }
        }
      } catch {
        // continua
      }
    }

    const finalId = isValidUUID(pet.id) ? pet.id! : generateUUID();

    const newRecord: PetRecord = {
      id: finalId,
      tenant_id: resolvedTenantId || undefined,
      user_id: resolvedUserId || undefined,
      name: (pet.name || 'Pet sem nome').trim(),
      tutor_name: (pet.tutor_name || 'Tutor').trim(),
      tutor_phone: pet.tutor_phone || '',
      species: pet.species || 'Cão',
      breed: pet.breed || 'SRD',
      sex: pet.sex || 'Não informado',
      age: pet.age || 'Não informada',
      weight: pet.weight || 'Não informado',
      microchip: pet.microchip || '',
      symptoms: pet.symptoms || '',
      notes: pet.notes || '',
      image_url: pet.image_url || '',
      last_triage_at: pet.last_triage_at || new Date().toISOString(),
      created_at: pet.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Salvar no Supabase se disponível
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();

        // Se ainda não temos tenant_id, buscar o tenant padrão
        if (!resolvedTenantId) {
          const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
          if (tenantData?.id) {
            resolvedTenantId = tenantData.id;
            newRecord.tenant_id = tenantData.id;
          }
        }

        const payload: any = {
          id: newRecord.id,
          user_id: newRecord.user_id || null,
          name: newRecord.name,
          tutor_name: newRecord.tutor_name,
          tutor_phone: newRecord.tutor_phone,
          species: newRecord.species,
          breed: newRecord.breed,
          sex: newRecord.sex,
          age: newRecord.age,
          weight: newRecord.weight,
          microchip: newRecord.microchip,
          symptoms: newRecord.symptoms,
          notes: newRecord.notes,
          image_url: newRecord.image_url,
          last_triage_at: newRecord.last_triage_at,
          updated_at: newRecord.updated_at
        };

        if (resolvedTenantId) {
          payload.tenant_id = resolvedTenantId;
        }

        const { error: upsertErr } = await supabase
          .from('pets')
          .upsert(payload, { onConflict: 'id' });

        if (upsertErr) {
          console.warn('[Supabase Pets] Tentando fallback sem colunas opcionais:', upsertErr.message);
          const fallbackPayload = { ...payload };
          delete fallbackPayload.image_url;
          const { error: fallbackErr } = await supabase
            .from('pets')
            .upsert(fallbackPayload, { onConflict: 'id' });

          if (fallbackErr) {
            console.error('[Supabase Pets] Erro crítico ao persistir pet no Supabase:', fallbackErr.message);
          }
        }
      } catch (e: any) {
        console.warn('Erro na chamada Supabase pets:', e?.message || e);
      }
    }

    // 2. Salvar sempre no LocalStorage
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      let allLocalPets: PetRecord[] = [];
      if (raw) {
        try {
          allLocalPets = JSON.parse(raw);
          if (!Array.isArray(allLocalPets)) allLocalPets = [];
        } catch {
          allLocalPets = [];
        }
      }

      const existingIdx = allLocalPets.findIndex(p => p.id === newRecord.id);
      
      let updatedList: PetRecord[];
      if (existingIdx >= 0) {
        updatedList = [...allLocalPets];
        updatedList[existingIdx] = { ...updatedList[existingIdx], ...newRecord };
      } else {
        updatedList = [newRecord, ...allLocalPets];
      }

      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      localStorage.setItem('vetpro_current_pet', JSON.stringify(newRecord));
    }

    return { success: true, data: newRecord };
  } catch (err: any) {
    console.error('Erro ao salvar pet:', err);
    return { success: false, error: err.message || 'Erro ao persistir dados do pet.' };
  }
}

/**
 * Remove um pet do banco e do LocalStorage com registro de auditoria e limpeza de dependências
 */
export async function deletePetRecord(id: string, petName?: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('pet_vaccines').delete().eq('pet_id', id);
      await supabase.from('pets').delete().eq('id', id);

      // Registrar no log de auditoria de segurança
      await supabase.from('audit_logs').insert({
        action: 'PET_DELETED',
        details: { pet_id: id, pet_name: petName || 'Pet', timestamp: new Date().toISOString() }
      });
    } catch (e) {
      console.warn('Erro ao deletar pet no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const list: PetRecord[] = JSON.parse(raw);
      const filtered = list.filter(p => p.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }

    // Remover vacinas associadas
    const rawVac = localStorage.getItem(VACCINES_STORAGE_KEY);
    if (rawVac) {
      const vacList: PetVaccineRecord[] = JSON.parse(rawVac);
      const filteredVac = vacList.filter(v => v.pet_id !== id);
      localStorage.setItem(VACCINES_STORAGE_KEY, JSON.stringify(filteredVac));
    }
  }

  return true;
}

/**
 * Identifica pets presentes no histórico de triagens clínicas mas que não estão
 * cadastrados na lista principal de pets. Garante isolamento estrito por tutor.
 */
export async function getOrphanPetsFromHistory(): Promise<Array<{
  suggestedPet: Partial<PetRecord>;
  sessionCount: number;
  latestSessionId: string;
  latestTriageAt: string;
}>> {
  let currentSessionUserId = '';
  let currentUserRole = 'tutor';

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        currentSessionUserId = session.user.id;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role) {
          currentUserRole = profile.role;
        }
      }
    } catch {}
  }

  // Buscar os pets existentes do usuário atual
  const currentPets = await getSavedPets(currentUserRole === 'tutor' ? currentSessionUserId : undefined);
  const existingNames = new Set(currentPets.map(p => p.name.trim().toLowerCase()));
  const existingIds = new Set(currentPets.map(p => p.id));

  // Buscar sessões filtradas pelo tutor
  const allSessions = await getChatSessions(currentUserRole === 'tutor' ? currentSessionUserId : undefined);
  const orphanMap = new Map<string, {
    suggestedPet: Partial<PetRecord>;
    sessionCount: number;
    latestSessionId: string;
    latestTriageAt: string;
  }>();

  for (const session of allSessions) {
    // Isolamento estrito: se o usuário logado for tutor, só considerar sessões dele
    if (currentUserRole === 'tutor' && currentSessionUserId) {
      if (!session.user_id || session.user_id !== currentSessionUserId) {
        continue;
      }
    }

    const petName = (session.pet_name || '').trim();
    if (!petName || petName.toLowerCase() === 'pet' || petName.toLowerCase() === 'pet sem nome') {
      continue;
    }

    const normName = petName.toLowerCase();
    const hasLinkedPet = session.pet_id && existingIds.has(session.pet_id);
    const hasMatchingName = existingNames.has(normName);

    if (!hasLinkedPet && !hasMatchingName) {
      const existingEntry = orphanMap.get(normName);
      if (!existingEntry) {
        orphanMap.set(normName, {
          suggestedPet: {
            name: petName,
            tutor_name: session.tutor_name || 'Tutor',
            species: session.species || 'Cão',
            breed: session.breed || 'SRD',
            sex: (session.sex as any) || 'Não informado',
            age: session.age || 'Não informada',
            weight: session.weight || 'Não informado',
            symptoms: session.summary || '',
            last_triage_at: session.updated_at || session.created_at,
          },
          sessionCount: 1,
          latestSessionId: session.id,
          latestTriageAt: session.updated_at || session.created_at,
        });
      } else {
        existingEntry.sessionCount += 1;
        if (new Date(session.updated_at).getTime() > new Date(existingEntry.latestTriageAt).getTime()) {
          existingEntry.latestTriageAt = session.updated_at;
          existingEntry.latestSessionId = session.id;
        }
      }
    }
  }

  return Array.from(orphanMap.values());
}

/**
 * Restaura um pet a partir de uma sessão de histórico clínico de triagem
 */
export async function restorePetFromHistory(suggestedPet: Partial<PetRecord>, sessionId?: string): Promise<{
  success: boolean;
  data?: PetRecord;
  error?: string;
}> {
  const saveResult = await savePetRecord(suggestedPet);
  if (!saveResult.success || !saveResult.data) {
    return saveResult;
  }

  const restoredPet = saveResult.data;

  // Re-vincular sessões de chat que tenham esse nome de pet
  try {
    const allSessions = await getChatSessions();
    const targetName = restoredPet.name.trim().toLowerCase();
    
    let updatedAny = false;
    const updatedSessions = allSessions.map(s => {
      if ((s.pet_name && s.pet_name.trim().toLowerCase() === targetName) || (sessionId && s.id === sessionId)) {
        updatedAny = true;
        return {
          ...s,
          pet_id: restoredPet.id,
          pet_name: restoredPet.name,
          species: restoredPet.species,
          breed: restoredPet.breed,
        };
      }
      return s;
    });

    if (updatedAny) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updatedSessions));
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        await supabase
          .from('chat_sessions')
          .update({ pet_id: restoredPet.id })
          .ilike('pet_name', restoredPet.name);
      }
    }
  } catch (e) {
    console.warn('Erro ao revincular sessões de chat após restaurar pet:', e);
  }

  return { success: true, data: restoredPet };
}

// ==============================================================================
// CADERNETA DE VACINAÇÃO DIGITAL & LEMBRETES WHATSAPP
// ==============================================================================

/**
 * Carrega a caderneta de vacinas de um pet específico
 */
export async function getPetVaccines(petId: string): Promise<PetVaccineRecord[]> {
  let list: PetVaccineRecord[] = [];

  // Tentar buscar do Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('pet_vaccines')
        .select('*')
        .eq('pet_id', petId)
        .order('next_due_date', { ascending: true });

      if (!error && data && data.length > 0) {
        list = data.map((d: any) => ({
          id: d.id,
          tenant_id: d.tenant_id,
          pet_id: d.pet_id,
          vaccine_name: d.vaccine_name,
          application_date: d.application_date,
          next_due_date: d.next_due_date,
          status: calculateVaccineStatus(d.next_due_date, d.status),
          batch_number: d.batch_number,
          manufacturer: d.manufacturer,
          vet_name: d.vet_name,
          vet_crmv: d.vet_crmv,
          notes: d.notes,
          reminder_phone: d.reminder_phone,
          reminder_sent: d.reminder_sent,
          reminder_sent_at: d.reminder_sent_at,
          created_at: d.created_at,
          updated_at: d.updated_at
        }));
        return list;
      }
    } catch (e) {
      console.warn('Erro ao consultar vacinas no Supabase:', e);
    }
  }

  // Fallback LocalStorage
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(VACCINES_STORAGE_KEY);
    if (raw) {
      try {
        const all: PetVaccineRecord[] = JSON.parse(raw);
        list = all
          .filter(v => v.pet_id === petId)
          .map(v => ({ ...v, status: calculateVaccineStatus(v.next_due_date, v.status) }))
          .sort((a, b) => new Date(a.next_due_date).getTime() - new Date(b.next_due_date).getTime());
      } catch {
        list = [];
      }
    }
  }

  return list;
}

/**
 * Calcula dinamicamente o status da vacina (vencida ou agendada/aplicada)
 */
function calculateVaccineStatus(nextDueDateStr: string, currentStatus?: string): 'applied' | 'scheduled' | 'overdue' {
  if (!nextDueDateStr) return 'applied';
  const dueDate = new Date(nextDueDateStr);
  const now = new Date();
  // Comparar apenas datas (sem horas)
  dueDate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  if (dueDate.getTime() < now.getTime()) {
    return 'overdue';
  }
  return currentStatus === 'scheduled' ? 'scheduled' : 'applied';
}

/**
 * Salva ou atualiza uma vacina na caderneta digital
 */
export async function savePetVaccine(vaccine: Partial<PetVaccineRecord>): Promise<{ success: boolean; data?: PetVaccineRecord; error?: string }> {
  try {
    if (!vaccine.pet_id || !vaccine.vaccine_name || !vaccine.next_due_date) {
      return { success: false, error: 'Pet, nome da vacina e data do próximo reforço são obrigatórios.' };
    }

    const calculatedStatus = calculateVaccineStatus(vaccine.next_due_date, vaccine.status);
    const finalId = isValidUUID(vaccine.id) ? vaccine.id! : generateUUID();

    const record: PetVaccineRecord = {
      id: finalId,
      pet_id: vaccine.pet_id,
      vaccine_name: vaccine.vaccine_name,
      application_date: vaccine.application_date || new Date().toISOString().split('T')[0],
      next_due_date: vaccine.next_due_date,
      status: calculatedStatus,
      batch_number: vaccine.batch_number || '',
      manufacturer: vaccine.manufacturer || '',
      vet_name: vaccine.vet_name || '',
      vet_crmv: vaccine.vet_crmv || '',
      notes: vaccine.notes || '',
      reminder_phone: vaccine.reminder_phone || '',
      reminder_sent: vaccine.reminder_sent || false,
      reminder_sent_at: vaccine.reminder_sent_at,
      created_at: vaccine.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // 1. Salvar no Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        const payload: any = {
          id: record.id,
          pet_id: record.pet_id,
          vaccine_name: record.vaccine_name,
          application_date: record.application_date,
          next_due_date: record.next_due_date,
          status: record.status,
          batch_number: record.batch_number,
          manufacturer: record.manufacturer,
          vet_name: record.vet_name,
          vet_crmv: record.vet_crmv,
          notes: record.notes,
          reminder_phone: record.reminder_phone,
          reminder_sent: record.reminder_sent,
          reminder_sent_at: record.reminder_sent_at,
          updated_at: record.updated_at
        };

        if (tenantData?.id) payload.tenant_id = tenantData.id;

        await supabase.from('pet_vaccines').upsert(payload, { onConflict: 'id' });
      } catch (e) {
        console.warn('Erro ao gravar vacina no Supabase:', e);
      }
    }

    // 2. Salvar no LocalStorage
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(VACCINES_STORAGE_KEY);
      let allVac: PetVaccineRecord[] = raw ? JSON.parse(raw) : [];
      const idx = allVac.findIndex(v => v.id === record.id);
      if (idx >= 0) {
        allVac[idx] = record;
      } else {
        allVac = [record, ...allVac];
      }
      localStorage.setItem(VACCINES_STORAGE_KEY, JSON.stringify(allVac));
    }

    return { success: true, data: record };
  } catch (err: any) {
    console.error('Erro ao salvar vacina:', err);
    return { success: false, error: err.message || 'Erro ao registrar vacina.' };
  }
}

/**
 * Remove uma vacina da caderneta
 */
export async function deletePetVaccine(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('pet_vaccines').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao deletar vacina no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(VACCINES_STORAGE_KEY);
    if (raw) {
      const allVac: PetVaccineRecord[] = JSON.parse(raw);
      const filtered = allVac.filter(v => v.id !== id);
      localStorage.setItem(VACCINES_STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  return true;
}

/**
 * Dispara o Lembrete de Vacinação pelo WhatsApp (Evolution API)
 */
export async function sendVaccineReminderViaWhatsApp(params: {
  pet: PetRecord;
  vaccine: PetVaccineRecord;
  customMessage?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { pet, vaccine, customMessage } = params;
    let phone = (vaccine.reminder_phone || pet.tutor_phone || '').replace(/\D/g, '');

    if (!phone || phone.length < 10) {
      return { success: false, error: 'Número de WhatsApp do tutor não informado ou inválido (mínimo com DDD).' };
    }

    // Auto-formata número para padrão internacional (DDI Brasil 55)
    if (phone.length === 10 || phone.length === 11) {
      phone = `55${phone}`;
    }

    // Formatar data em pt-BR
    const dueDateFormatted = new Date(vaccine.next_due_date + 'T12:00:00').toLocaleDateString('pt-BR');
    const isOverdue = new Date(vaccine.next_due_date + 'T12:00:00').getTime() < Date.now();

    // Mensagem padrão formatada com negrito de asterisco único (*texto*)
    const defaultText = isOverdue
      ? `🚨 *Lembrete Importante de Saúde Animal - VetPro Orienta*\n\nOlá, *${pet.tutor_name || 'Tutor'}*! 🐾\n\nIdentificamos que o reforço da vacina *${vaccine.vaccine_name}* do(a) *${pet.name}* (${pet.species}) venceu em *${dueDateFormatted}*.\n\nManter a imunização em dia é fundamental para protegê-lo contra doenças graves.\n\n📅 Entre em contato conosco para agendar a aplicação do reforço!`
      : `🐾 *Lembrete de Vacinação - VetPro Orienta*\n\nOlá, *${pet.tutor_name || 'Tutor'}*! Tudo bem?\n\nPassando para lembrar que a próxima dose/reforço da vacina *${vaccine.vaccine_name}* do seu pet *${pet.name}* está prevista para *${dueDateFormatted}*.\n\n📍 Laboratório: ${vaccine.manufacturer || 'Vacina Ética'}\n\nGaranta a proteção do seu melhor amigo! Agende seu horário com antecedência na clínica.`;

    const messageToSend = customMessage || defaultText;

    const config = getEvolutionConfig();

    // Validação preventiva se o servidor Evolution API está configurado
    if (!config.serverUrl && typeof window !== 'undefined' && !localStorage.getItem('vetpro_evolution_url')) {
      // Deixa o backend tentar usar o EVOLUTION_SERVER_URL do servidor se disponível
    }

    const targetInstance = (config.defaultInstance || 'vetpro-clinica').trim();

    const result = await callEvolutionProxy('send-text', {
      serverUrl: config.serverUrl,
      apiKey: config.apiKey,
      instanceName: targetInstance,
      data: {
        number: phone,
        text: messageToSend,
        delay: 1200,
        linkPreview: false
      }
    });

    // Marcar como lembrete enviado
    const nowIso = new Date().toISOString();
    await savePetVaccine({
      ...vaccine,
      reminder_phone: phone,
      reminder_sent: true,
      reminder_sent_at: nowIso
    });

    return { 
      success: true, 
      messageId: result?.key?.id || result?.id || 'msg_ok' 
    };
  } catch (err: any) {
    const errorStr = cleanErrorMessage(err);
    console.warn(`[Evolution API] Não foi possível enviar lembrete via WhatsApp: ${errorStr}`);
    return { success: false, error: errorStr };
  }
}

/**
 * Carrega as sessões de chat com histórico e isolamento estrito por usuário
 */
export async function getChatSessions(filterUserId?: string): Promise<ChatSessionRecord[]> {
  let sessions: ChatSessionRecord[] = [];
  let targetUserId = filterUserId;
  let currentSessionUserId = '';
  let currentUserRole = 'tutor';

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        currentSessionUserId = session.user.id;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role) {
          currentUserRole = profile.role;
        }

        if (!targetUserId && currentUserRole === 'tutor') {
          targetUserId = session.user.id;
        }
      }
    } catch {
      // continua
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      let query = supabase
        .from('chat_sessions')
        .select(`
          *,
          chat_messages (*)
        `)
        .order('updated_at', { ascending: false });

      if (targetUserId && targetUserId !== 'all') {
        query = query.eq('user_id', targetUserId);
      }

      const { data: sessionRows, error } = await query;

      if (!error && sessionRows && sessionRows.length > 0) {
        sessions = sessionRows.map((s: any) => ({
          id: s.id,
          tenant_id: s.tenant_id,
          user_id: s.user_id,
          pet_id: s.pet_id,
          tutor_name: s.tutor_name,
          pet_name: s.pet_name,
          species: s.species || 'Cão',
          breed: s.breed || 'SRD',
          sex: s.sex || 'Não informado',
          age: s.age || 'Não informada',
          weight: s.weight || 'Não informado',
          triage_level: s.triage_level || 'verde',
          summary: s.summary,
          created_at: s.created_at,
          updated_at: s.updated_at || s.created_at,
          messages: (s.chat_messages || [])
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((m: any) => ({
              id: m.id,
              session_id: m.session_id,
              role: (m.sender_type === 'ai' || m.sender_type === 'system') ? 'model' : 'user',
              content: m.content,
              image_url: m.image_url,
              created_at: m.created_at
            }))
        }));
        return sessions;
      }
    } catch (e) {
      console.warn('Erro ao buscar chat_sessions no Supabase:', e);
    }
  }

  // Fallback para LocalStorage
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (raw) {
      try {
        const parsed: ChatSessionRecord[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          if (targetUserId && targetUserId !== 'all') {
            sessions = parsed.filter(s => s.user_id === targetUserId);
          } else if (currentUserRole === 'tutor' && currentSessionUserId) {
            sessions = parsed.filter(s => s.user_id === currentSessionUserId);
          } else {
            sessions = parsed;
          }
        }
      } catch {
        sessions = [];
      }
    }
  }

  return sessions;
}

/**
 * Busca uma sessão de chat específica por ID
 */
export async function getChatSessionById(sessionId: string): Promise<ChatSessionRecord | null> {
  const all = await getChatSessions('all');
  return all.find(s => s.id === sessionId) || null;
}

/**
 * Busca a última sessão de chat realizada para um determinado Pet
 */
export async function getLatestChatSessionForPet(petId: string): Promise<ChatSessionRecord | null> {
  const all = await getChatSessions('all');
  const petSessions = all
    .filter(s => s.pet_id === petId)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  return petSessions.length > 0 ? petSessions[0] : null;
}

/**
 * Salva ou atualiza uma sessão de chat e suas mensagens
 */
export async function saveChatSession(
  sessionData: Partial<ChatSessionRecord>,
  messages: Array<{ id: string; role: 'user' | 'model'; content: string; image_url?: string }>
): Promise<{ success: boolean; data?: ChatSessionRecord; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const sessionId = isValidUUID(sessionData.id) ? sessionData.id! : generateUUID();
    
    let resolvedUserId = sessionData.user_id;
    let resolvedTenantId = sessionData.tenant_id;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          if (!resolvedUserId) {
            resolvedUserId = session.user.id;
          }
          if (!resolvedTenantId) {
            const { data: userProf } = await supabase
              .from('user_profiles')
              .select('tenant_id')
              .eq('id', session.user.id)
              .maybeSingle();
            if (userProf?.tenant_id) {
              resolvedTenantId = userProf.tenant_id;
            }
          }
        }
      } catch {
        // continua
      }
    }

    // Gerar resumo automático se não fornecido
    const firstUserMsg = messages.find(m => m.role === 'user')?.content || 'Triagem geral';
    const autoSummary = sessionData.summary || (firstUserMsg.length > 60 ? firstUserMsg.substring(0, 57) + '...' : firstUserMsg);

    const fullSession: ChatSessionRecord = {
      id: sessionId,
      tenant_id: resolvedTenantId || undefined,
      user_id: resolvedUserId || undefined,
      pet_id: isValidUUID(sessionData.pet_id) ? sessionData.pet_id : undefined,
      tutor_name: sessionData.tutor_name || 'Tutor',
      pet_name: sessionData.pet_name || 'Pet',
      species: sessionData.species || 'Cão',
      breed: sessionData.breed || 'SRD',
      sex: sessionData.sex || 'Não informado',
      age: sessionData.age || 'Não informada',
      weight: sessionData.weight || 'Não informado',
      triage_level: sessionData.triage_level || 'verde',
      summary: autoSummary,
      messages: messages.map(m => ({
        id: isValidUUID(m.id) ? m.id : generateUUID(),
        session_id: sessionId,
        role: m.role,
        content: m.content,
        image_url: m.image_url,
        created_at: nowIso
      })),
      created_at: sessionData.created_at || nowIso,
      updated_at: nowIso
    };

    // 1. Salvar no Supabase se disponível
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();

        if (!resolvedTenantId) {
          const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
          if (tenantData?.id) {
            resolvedTenantId = tenantData.id;
            fullSession.tenant_id = tenantData.id;
          }
        }

        const payload: any = {
          id: fullSession.id,
          user_id: fullSession.user_id || null,
          tutor_name: fullSession.tutor_name,
          pet_name: fullSession.pet_name,
          species: fullSession.species,
          breed: fullSession.breed,
          sex: fullSession.sex,
          age: fullSession.age,
          weight: fullSession.weight,
          triage_level: fullSession.triage_level,
          summary: fullSession.summary,
          updated_at: fullSession.updated_at
        };

        if (resolvedTenantId) payload.tenant_id = resolvedTenantId;
        if (fullSession.pet_id) payload.pet_id = fullSession.pet_id;

        const { error: sessionUpsertErr } = await supabase
          .from('chat_sessions')
          .upsert(payload, { onConflict: 'id' });

        if (sessionUpsertErr) {
          console.warn('[Supabase ChatSession] Erro ao salvar sessão:', sessionUpsertErr.message);
        } else if (fullSession.messages.length > 0) {
          // Salvar as mensagens mais recentes
          const messagesPayload = fullSession.messages.map(m => ({
            id: m.id,
            session_id: fullSession.id,
            sender_type: m.role === 'model' ? 'ai' : 'tutor',
            content: m.content,
            image_url: m.image_url,
            created_at: nowIso
          }));

          await supabase.from('chat_messages').upsert(messagesPayload, { onConflict: 'id' });
        }
      } catch (e) {
        console.warn('Erro ao salvar chat_session no Supabase:', e);
      }
    }

    // 2. Salvar no LocalStorage
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
      let all: ChatSessionRecord[] = [];
      if (raw) {
        try { all = JSON.parse(raw); } catch { all = []; }
      }
      const existingIdx = all.findIndex(s => s.id === fullSession.id);
      let updated: ChatSessionRecord[];
      if (existingIdx >= 0) {
        updated = [...all];
        updated[existingIdx] = fullSession;
      } else {
        updated = [fullSession, ...all];
      }
      localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
    }

    return { success: true, data: fullSession };
  } catch (err: any) {
    console.error('Erro ao salvar chat session:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Remove uma sessão de chat
 */
export async function deleteChatSession(sessionId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      await supabase.from('chat_messages').delete().eq('session_id', sessionId);
      await supabase.from('chat_sessions').delete().eq('id', sessionId);
    } catch (e) {
      console.warn('Erro ao excluir sessão no Supabase:', e);
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (raw) {
      const all: ChatSessionRecord[] = JSON.parse(raw);
      const filtered = all.filter(s => s.id !== sessionId);
      localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(filtered));
    }
  }

  return true;
}
