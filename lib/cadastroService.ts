import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export interface TutorRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  plan_name?: string;
  subscription_status?: string;
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

const TUTORS_LOCAL_KEY = 'vetpro_tutors_real_list';
const VETS_LOCAL_KEY = 'vetpro_vets_real_list';

// --- TUTORES ---
export function getLocalTutors(): TutorRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(TUTORS_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('role', 'tutor')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: TutorRecord[] = data.map((d: any) => ({
          id: d.id,
          name: d.full_name || d.name || 'Tutor',
          email: d.email || '',
          phone: d.phone || '',
          cpf: d.cpf || '',
          plan_name: d.plan_name || 'Essencial',
          subscription_status: d.subscription_status || 'ACTIVE',
          status: d.status || 'active',
          pets_count: d.pets_count || 0,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString(),
        }));
        saveLocalTutors(mapped);
        return mapped;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar tutores do Supabase:', e);
  }
  return getLocalTutors();
}

export async function saveTutor(tutor: Partial<TutorRecord> & { name: string; email: string }): Promise<{ success: boolean; data?: TutorRecord; error?: string }> {
  try {
    const now = new Date().toISOString();
    const tutorToSave: TutorRecord = {
      id: tutor.id || `tutor-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: tutor.name.trim(),
      email: tutor.email.trim().toLowerCase(),
      phone: tutor.phone || '',
      cpf: tutor.cpf || '',
      plan_name: tutor.plan_name || 'Essencial',
      subscription_status: tutor.subscription_status || 'ACTIVE',
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
          role: 'tutor',
          plan_name: tutorToSave.plan_name,
          subscription_status: tutorToSave.subscription_status,
          status: tutorToSave.status,
          updated_at: now,
        });
      } catch (e) {
        console.warn('Erro ao sincronizar tutor no Supabase:', e);
      }
    }

    const current = getLocalTutors().filter(t => t.id !== tutorToSave.id);
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
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(VETS_LOCAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
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
  try {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('role', ['veterinario', 'admin', 'super_admin'])
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: VetRecord[] = data.map((d: any) => ({
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
        saveLocalVets(mapped);
        return mapped;
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar veterinários do Supabase:', e);
  }
  return getLocalVets();
}

export async function saveVet(vet: Partial<VetRecord> & { name: string; email: string; crmv: string }): Promise<{ success: boolean; data?: VetRecord; error?: string }> {
  try {
    const now = new Date().toISOString();
    const vetToSave: VetRecord = {
      id: vet.id || `vet-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    const current = getLocalVets().filter(v => v.id !== vetToSave.id);
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
