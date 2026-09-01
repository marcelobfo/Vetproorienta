import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export interface SystemModule {
  id: string;
  name: string;
  category: string;
  description: string;
  enabled: boolean;
  requiresSuperAdmin?: boolean;
  requiresCrmv?: boolean;
  settings?: Record<string, any>;
}

export const SYSTEM_MODULE_KEYS = {
  PARCEIROS_GPS: 'mod-parceiros-gps',
  EXPERT_VET: 'mod-expert',
  PRESCRIPTION: 'mod-prescription',
  WHATSAPP_EVOLUTION: 'mod-whatsapp',
  TRIAGE_VISION: 'mod-triage-ai',
  REPORTS: 'mod-reports',
  WHITELABEL: 'mod-whitelabel',
} as const;

export const DEFAULT_MODULES: SystemModule[] = [
  {
    id: 'mod-parceiros-gps',
    name: 'Rede de Parceiros, GPS & Anúncios Rotativos',
    category: 'Parceiros & Monetização',
    description: 'Habilita o guia de parceiros credenciados (clínicas, hospitais 24h, farmácias), geolocalização por proximidade GPS e banners de anúncios rotativos.',
    enabled: true,
    requiresSuperAdmin: true,
    settings: {
      gps_enabled: true,
      show_in_tutor_menu: true,
      show_rotative_ads: true,
    }
  },
  {
    id: 'mod-expert',
    name: 'Encaminhamento para Veterinário Humano',
    category: 'Atendimento Clínico',
    description: 'Permite que a IA transfira o atendimento diretamente para a fila de um médico veterinário de plantão quando o tutor solicitar ou houver urgência.',
    enabled: true,
    requiresCrmv: true
  },
  {
    id: 'mod-prescription',
    name: 'Prescrição Digital com CRMV',
    category: 'Clínico & Legal',
    description: 'Gera receitas veterinárias assinadas digitalmente com o CRMV e UF do médico veterinário responsável, enviando PDF seguro ao tutor.',
    enabled: true,
    requiresCrmv: true
  },
  {
    id: 'mod-whatsapp',
    name: 'Disparos Automáticos WhatsApp (Evolution API)',
    category: 'Comunicação & Retenção',
    description: 'Envia lembretes automáticos de vacinação, reforços de antiparasitários e retornos pós-consulta diretamente no WhatsApp do tutor.',
    enabled: true
  },
  {
    id: 'mod-triage-ai',
    name: 'Triagem com Visão Computacional (Fotos de Lesões/Olhos)',
    category: 'Inteligência Artificial',
    description: 'Habilita o upload de imagens pelo tutor durante o chat para análise preliminar de pele, mucosas e lesões pelo Gemini Multimodal.',
    enabled: true
  },
  {
    id: 'mod-reports',
    name: 'Exportação e Relatórios Clínicos (PDF/Excel)',
    category: 'Gestão & Auditoria',
    description: 'Gera relatórios consolidados de sintomas mais frequentes por raça, histórico de triagens e índices de encaminhamento.',
    enabled: false
  },
  {
    id: 'mod-whitelabel',
    name: 'Domínio Personalizado & White-Label',
    category: 'Personalização',
    description: 'Remove a marca VetPro e exibe apenas o logotipo, cores e domínio próprio da clínica veterinária contratante.',
    enabled: false
  }
];

const LOCAL_MODULES_STORAGE_KEY = 'vetpro_modules_config';

/**
 * Obtém o mapa de status dos módulos (chave -> booleano)
 */
export function getLocalModulesMap(): Record<string, boolean> {
  if (typeof window === 'undefined') {
    const defaultMap: Record<string, boolean> = {};
    DEFAULT_MODULES.forEach(m => {
      defaultMap[m.id] = m.enabled;
    });
    return defaultMap;
  }

  try {
    const raw = localStorage.getItem(LOCAL_MODULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_MODULES.reduce((acc, m) => ({ ...acc, [m.id]: m.enabled }), {}),
        ...parsed
      };
    }
  } catch (e) {
    console.warn('Erro ao ler módulos locais:', e);
  }

  const defaultMap: Record<string, boolean> = {};
  DEFAULT_MODULES.forEach(m => {
    defaultMap[m.id] = m.enabled;
  });
  return defaultMap;
}

/**
 * Verifica rapidamente se um determinado módulo está ativo
 */
export function isModuleActive(moduleKey: string): boolean {
  const map = getLocalModulesMap();
  if (map[moduleKey] !== undefined) {
    return Boolean(map[moduleKey]);
  }
  const found = DEFAULT_MODULES.find(m => m.id === moduleKey);
  return found ? found.enabled : true;
}

/**
 * Carrega a lista completa de módulos com dados mesclados do Supabase e LocalStorage
 */
export async function getSystemModules(): Promise<SystemModule[]> {
  let moduleMap = getLocalModulesMap();

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('*');

      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          moduleMap[row.module_key] = row.enabled;
        });

        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_MODULES_STORAGE_KEY, JSON.stringify(moduleMap));
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar tenant_modules no Supabase:', e);
    }
  }

  return DEFAULT_MODULES.map(m => ({
    ...m,
    enabled: moduleMap[m.id] !== undefined ? moduleMap[m.id] : m.enabled
  }));
}

/**
 * Atualiza o status de um módulo específico (Ação Super Admin)
 */
export async function toggleSystemModule(
  moduleKey: string, 
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const map = getLocalModulesMap();
    map[moduleKey] = enabled;

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_MODULES_STORAGE_KEY, JSON.stringify(map));
      window.dispatchEvent(new Event('vetpro_modules_changed'));
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data: tenantData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        const tenantId = tenantData?.id;

        if (tenantId) {
          await supabase.from('tenant_modules').upsert({
            tenant_id: tenantId,
            module_key: moduleKey,
            enabled: enabled,
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,module_key' });
        }

        // Registrar auditoria
        await supabase.from('audit_logs').insert({
          action: 'MODULE_TOGGLED',
          details: { module_key: moduleKey, enabled: enabled, timestamp: new Date().toISOString() }
        });
      } catch (e) {
        console.warn('Erro ao sincronizar módulo no Supabase:', e);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao alterar estado do módulo' };
  }
}
