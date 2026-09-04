import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { isValidUUID, generateUUID } from '@/lib/petService';

export interface TutorRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  plan_name?: string;
  plan_id?: string;
  subscription_status?: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  status: 'active' | 'inactive';
  pets_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VetRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  crmv: string;
  crmv_uf: string;
  crmv_validated: boolean;
  specialty?: string;
  clinic_name?: string;
  role: 'veterinario' | 'admin' | 'super_admin';
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_TUTORS: TutorRecord[] = [
  {
    id: 'tutor-lavinia-01',
    name: 'Lavínia Rocha',
    email: 'lavinia.rocha@email.com',
    phone: '(11) 98877-6655',
    cpf: '345.678.901-23',
    plan_name: 'Especialista',
    plan_id: 'especialista',
    subscription_status: 'ACTIVE',
    asaas_customer_id: 'cus_000005934120',
    asaas_subscription_id: 'sub_000008432110',
    status: 'active',
    pets_count: 2,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tutor-carlos-02',
    name: 'Carlos Eduardo',
    email: 'carlos.t@gmail.com',
    phone: '(11) 91234-5678',
    cpf: '123.456.789-00',
    plan_name: 'Essencial',
    plan_id: 'essencial',
    subscription_status: 'ACTIVE',
    asaas_customer_id: 'cus_000004123987',
    asaas_subscription_id: 'sub_000007123987',
    status: 'active',
    pets_count: 1,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tutor-marcelo-03',
    name: 'Marcelo Oliveira',
    email: 'marcelobfo@gmail.com',
    phone: '(11) 99999-8888',
    cpf: '456.789.012-34',
    plan_name: 'Especialista',
    plan_id: 'especialista',
    subscription_status: 'ACTIVE',
    asaas_customer_id: 'cus_000009988776',
    asaas_subscription_id: 'sub_000006655443',
    status: 'active',
    pets_count: 2,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tutor-mariana-04',
    name: 'Mariana Silva',
    email: 'mariana.silva@petlover.com',
    phone: '(11) 97654-3210',
    cpf: '234.567.890-12',
    plan_name: 'Essencial',
    plan_id: 'essencial',
    subscription_status: 'PENDING_PAYMENT',
    asaas_customer_id: 'cus_000003216549',
    asaas_subscription_id: 'sub_000005823194',
    status: 'active',
    pets_count: 1,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEFAULT_VETS: VetRecord[] = [
  {
    id: 'vet-amanda-01',
    name: 'Dra. Amanda Nogueira',
    email: 'amanda.vet@saovet.com.br',
    phone: '(11) 98765-4321',
    crmv: '34892',
    crmv_uf: 'SP',
    crmv_validated: true,
    specialty: 'Clínica Geral & Cirurgia',
    clinic_name: 'Clínica Veterinária São Francisco',
    role: 'veterinario',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vet-roberto-02',
    name: 'Dr. Roberto Mendes',
    email: 'roberto@saovet.com.br',
    phone: '(11) 97777-6666',
    crmv: '18204',
    crmv_uf: 'SP',
    crmv_validated: true,
    specialty: 'Cardiologia & Diretor Clínico',
    clinic_name: 'Hospital Veterinário PetCare 24h',
    role: 'admin',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 90).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'vet-camila-03',
    name: 'Dra. Camila Torres',
    email: 'camila.torres@amigofiel.vet.br',
    phone: '(21) 99812-3456',
    crmv: '22415',
    crmv_uf: 'RJ',
    crmv_validated: true,
    specialty: 'Dermatologia Veterinária',
    clinic_name: 'Clínica Amigo Fiel',
    role: 'veterinario',
    status: 'active',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const TUTORS_LOCAL_KEY = 'vetpro_tutors_real_list';
const VETS_LOCAL_KEY = 'vetpro_vets_real_list';

// --- TUTORES ---
export function getLocalTutors(): TutorRecord[] {
  if (typeof window === 'undefined') return DEFAULT_TUTORS;
  try {
    const raw = localStorage.getItem(TUTORS_LOCAL_KEY);
    if (!raw) {
      localStorage.setItem(TUTORS_LOCAL_KEY, JSON.stringify(DEFAULT_TUTORS));
      return DEFAULT_TUTORS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_TUTORS;
  } catch {
    return DEFAULT_TUTORS;
  }
}

export function saveLocalTutors(tutors: TutorRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORS_LOCAL_KEY, JSON.stringify(tutors));
  } catch (err) {
    console.error('Erro ao salvar tutores localmente:', err);
  }
}

export async function getTutors(): Promise<TutorRecord[]> {
  const localTutors = getLocalTutors();
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .or('role.eq.tutor,role.is.null,role.eq.user')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbMapped: TutorRecord[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || d.name || 'Tutor',
          email: d.email || '',
          phone: d.phone || '',
          cpf: d.cpf || d.cpf_cnpj || '',
          plan_name: d.plan_name || d.plan_selected || 'Essencial',
          plan_id: d.plan_id || (d.plan_name?.toLowerCase().includes('especialista') ? 'especialista' : 'essencial'),
          subscription_status: d.subscription_status || 'ACTIVE',
          asaas_customer_id: d.asaas_customer_id || '',
          asaas_subscription_id: d.subscription_id || d.asaas_subscription_id || '',
          status: d.status || 'active',
          pets_count: d.pets_count || 0,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        }));

        const mergedMap = new Map<string, TutorRecord>();
        localTutors.forEach(t => mergedMap.set(t.id, t));
        dbMapped.forEach(t => mergedMap.set(t.id, { ...mergedMap.get(t.id), ...t }));
        const finalTutors = Array.from(mergedMap.values());
        saveLocalTutors(finalTutors);
        return finalTutors;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar tutores do Supabase:', e);
  }
  return localTutors;
}

export async function saveTutor(tutor: Partial<TutorRecord> & { name: string; email: string }): Promise<{ success: boolean; data?: TutorRecord; error?: string }> {
  try {
    const now = new Date().toISOString();
    const finalId = isValidUUID(tutor.id) ? tutor.id! : (tutor.id || generateUUID());
    const tutorToSave: TutorRecord = {
      id: finalId,
      name: tutor.name.trim(),
      email: tutor.email.trim().toLowerCase(),
      phone: tutor.phone || '',
      cpf: tutor.cpf || '',
      plan_name: tutor.plan_name || 'Essencial',
      plan_id: tutor.plan_id || (tutor.plan_name?.toLowerCase().includes('especialista') ? 'especialista' : 'essencial'),
      subscription_status: tutor.subscription_status || 'ACTIVE',
      asaas_customer_id: tutor.asaas_customer_id || '',
      asaas_subscription_id: tutor.asaas_subscription_id || '',
      status: tutor.status || 'active',
      pets_count: tutor.pets_count || 0,
      created_at: tutor.created_at || now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_profiles').upsert({
          id: tutorToSave.id,
          full_name: tutorToSave.name,
          email: tutorToSave.email,
          phone: tutorToSave.phone,
          cpf: tutorToSave.cpf,
          cpf_cnpj: tutorToSave.cpf,
          role: 'tutor',
          plan_name: tutorToSave.plan_name,
          plan_id: tutorToSave.plan_id,
          subscription_status: tutorToSave.subscription_status,
          asaas_customer_id: tutorToSave.asaas_customer_id || null,
          subscription_id: tutorToSave.asaas_subscription_id || null,
          status: tutorToSave.status,
          updated_at: now,
        });
      } catch (e) {
        console.warn('Erro ao sincronizar tutor no Supabase:', e);
      }
    }

    const current = getLocalTutors().filter(t => t.id !== tutorToSave.id && t.email !== tutorToSave.email);
    saveLocalTutors([tutorToSave, ...current]);
    return { success: true, data: tutorToSave };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar tutor' };
  }
}

export async function deleteTutor(tutorId: string, tutorName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      // Exclui completamente o usuário da tabela auth.users (cascata para user_profiles e pets via FKs)
      const { error } = await supabase.rpc('delete_user', { user_id_to_delete: tutorId });
      
      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('audit_logs').insert({
        action: 'TUTOR_DELETED',
        details: { tutor_id: tutorId, tutor_name: tutorName || 'Tutor', timestamp: new Date().toISOString() }
      });
    }
    const current = getLocalTutors().filter(t => t.id !== tutorId);
    saveLocalTutors(current);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir tutor' };
  }
}

// --- VETERINÁRIOS ---
export function getLocalVets(): VetRecord[] {
  if (typeof window === 'undefined') return DEFAULT_VETS;
  try {
    const raw = localStorage.getItem(VETS_LOCAL_KEY);
    if (!raw) {
      localStorage.setItem(VETS_LOCAL_KEY, JSON.stringify(DEFAULT_VETS));
      return DEFAULT_VETS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_VETS;
  } catch {
    return DEFAULT_VETS;
  }
}

export function saveLocalVets(vets: VetRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VETS_LOCAL_KEY, JSON.stringify(vets));
  } catch (err) {
    console.error('Erro ao salvar veterinários localmente:', err);
  }
}

export async function getVets(): Promise<VetRecord[]> {
  const localVets = getLocalVets();
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['veterinario', 'admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbMapped: VetRecord[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || d.name || 'Veterinário',
          email: d.email || '',
          phone: d.phone || '',
          crmv: d.crmv || '',
          crmv_uf: d.crmv_uf || 'SP',
          crmv_validated: Boolean(d.crmv_validated ?? true),
          specialty: d.specialty || 'Clínica Geral',
          clinic_name: d.clinic_name || 'Unidade Principal',
          role: d.role || 'veterinario',
          status: d.status || 'active',
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        }));

        const mergedMap = new Map<string, VetRecord>();
        localVets.forEach(v => mergedMap.set(v.id, v));
        dbMapped.forEach(v => mergedMap.set(v.id, { ...mergedMap.get(v.id), ...v }));
        const finalVets = Array.from(mergedMap.values());
        saveLocalVets(finalVets);
        return finalVets;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar veterinários do Supabase:', e);
  }
  return localVets;
}

export async function saveVet(vet: Partial<VetRecord> & { name: string; email: string; crmv: string }): Promise<{ success: boolean; data?: VetRecord; error?: string }> {
  try {
    const now = new Date().toISOString();
    const finalId = isValidUUID(vet.id) ? vet.id! : (vet.id || generateUUID());
    const vetToSave: VetRecord = {
      id: finalId,
      name: vet.name.trim(),
      email: vet.email.trim().toLowerCase(),
      phone: vet.phone || '',
      crmv: vet.crmv.trim(),
      crmv_uf: (vet.crmv_uf || 'SP').toUpperCase(),
      crmv_validated: vet.crmv_validated ?? true,
      specialty: vet.specialty || 'Clínica Geral',
      clinic_name: vet.clinic_name || 'Unidade Principal',
      role: vet.role || 'veterinario',
      status: vet.status || 'active',
      created_at: vet.created_at || now,
      updated_at: now,
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('user_profiles').upsert({
          id: vetToSave.id,
          full_name: vetToSave.name,
          email: vetToSave.email,
          phone: vetToSave.phone,
          crmv: vetToSave.crmv,
          crmv_uf: vetToSave.crmv_uf,
          crmv_validated: vetToSave.crmv_validated,
          specialty: vetToSave.specialty,
          clinic_name: vetToSave.clinic_name,
          role: vetToSave.role,
          status: vetToSave.status,
          updated_at: now,
        });
      } catch (e) {
        console.warn('Erro ao sincronizar veterinário no Supabase:', e);
      }
    }

    const current = getLocalVets().filter(v => v.id !== vetToSave.id && v.email !== vetToSave.email);
    saveLocalVets([vetToSave, ...current]);
    return { success: true, data: vetToSave };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar veterinário' };
  }
}

export async function deleteVet(vetId: string, vetName?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      // Exclui completamente o usuário da tabela auth.users (cascata para user_profiles via FKs)
      const { error } = await supabase.rpc('delete_user', { user_id_to_delete: vetId });

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('audit_logs').insert({
        action: 'VET_DELETED',
        details: { vet_id: vetId, vet_name: vetName || 'Veterinário', timestamp: new Date().toISOString() }
      });
    }
    const current = getLocalVets().filter(v => v.id !== vetId);
    saveLocalVets(current);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir veterinário' };
  }
}

export function resetDefaultCadastros(): { tutors: TutorRecord[]; vets: VetRecord[] } {
  saveLocalTutors(DEFAULT_TUTORS);
  saveLocalVets(DEFAULT_VETS);
  return { tutors: DEFAULT_TUTORS, vets: DEFAULT_VETS };
}
