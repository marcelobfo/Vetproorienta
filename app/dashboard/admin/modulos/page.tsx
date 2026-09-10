'use client';

import { useState, useEffect } from 'react';
import { 
  Zap, ShieldCheck, PhoneCall, FileSpreadsheet, 
  Stethoscope, Sparkles, CheckCircle2, AlertCircle, Save, Building, RefreshCw,
  MapPin, ShieldAlert, Crown, LayoutGrid, ArrowRight, Eye, EyeOff
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { DEFAULT_MODULES, SYSTEM_MODULE_KEYS, getHomeAdvantagesMode, setHomeAdvantagesMode, HomeAdvantagesMode } from '@/lib/moduleService';

interface ModuleItem {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: any;
  enabled: boolean;
  requiresCrmv?: boolean;
  requiresSuperAdmin?: boolean;
}

const INITIAL_MODULES: ModuleItem[] = [
  {
    id: SYSTEM_MODULE_KEYS.PARCEIROS_GPS,
    name: 'Rede de Parceiros Credenciados, GPS & Anúncios Rotativos',
    category: 'Parceiros & Monetização',
    description: 'Ativa o módulo público e restrito de parceiros credenciados (hospitais 24h, clínicas e pet shops), cálculo de proximidade por GPS e os banners de anúncios rotativos no sistema.',
    icon: MapPin,
    enabled: true,
    requiresSuperAdmin: true
  },
  {
    id: 'mod-expert',
    name: 'Encaminhamento para Veterinário Humano',
    category: 'Atendimento Clínico',
    description: 'Permite que a IA transfira o atendimento diretamente para a fila de um médico veterinário de plantão quando o tutor solicitar ou houver urgência.',
    icon: Stethoscope,
    enabled: true,
    requiresCrmv: true
  },
  {
    id: 'mod-prescription',
    name: 'Prescrição Digital com CRMV',
    category: 'Clínico & Legal',
    description: 'Gera receitas veterinárias assinadas digitalmente com o CRMV e UF do médico veterinário responsável, enviando PDF seguro ao tutor.',
    icon: ShieldCheck,
    enabled: true,
    requiresCrmv: true
  },
  {
    id: 'mod-whatsapp',
    name: 'Disparos Automáticos WhatsApp (Evolution API)',
    category: 'Comunicação & Retenção',
    description: 'Envia lembretes automáticos de vacinação, reforços de antiparasitários e retornos pós-consulta diretamente no WhatsApp do tutor.',
    icon: PhoneCall,
    enabled: true
  },
  {
    id: 'mod-triage-ai',
    name: 'Triagem com Visão Computacional (Fotos de Lesões/Olhos)',
    category: 'Inteligência Artificial',
    description: 'Habilita o upload de imagens pelo tutor durante o chat para análise preliminar de pele, mucosas e lesões pelo Gemini Multimodal.',
    icon: Sparkles,
    enabled: true
  },
  {
    id: 'mod-reports',
    name: 'Exportação e Relatórios Clínicos (PDF/Excel)',
    category: 'Gestão & Auditoria',
    description: 'Gera relatórios consolidados de sintomas mais frequentes por raça, histórico de triagens e índices de encaminhamento.',
    icon: FileSpreadsheet,
    enabled: false
  },
  {
    id: 'mod-whitelabel',
    name: 'Domínio Personalizado & White-Label',
    category: 'Personalização',
    description: 'Remove a marca VetPro e exibe apenas o logotipo, cores e domínio próprio da clínica veterinária contratante.',
    icon: Zap,
    enabled: false
  }
];

export default function ModulosAdminPage() {
  const [modules, setModules] = useState<ModuleItem[]>(INITIAL_MODULES);
  const [selectedTenant, setSelectedTenant] = useState('global');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [homeMode, setHomeMode] = useState<HomeAdvantagesMode>('benefits');
  const [savingHomeMode, setSavingHomeMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadModules = async () => {
    setLoading(true);
    try {
      // Carrega modo da Home
      const localHomeMode = getHomeAdvantagesMode();
      setHomeMode(localHomeMode);

      try {
        const resSettings = await fetch('/api/admin/home-settings');
        const dataSettings = await resSettings.json();
        if (dataSettings?.settings?.advantages_mode) {
          setHomeMode(dataSettings.settings.advantages_mode);
        }
      } catch {}

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('tenant_modules')
          .select('*');

        if (data && data.length > 0) {
          const map: Record<string, boolean> = {};
          data.forEach((row: any) => {
            map[row.module_key] = row.enabled;
            if (row.module_key === SYSTEM_MODULE_KEYS.HOME_BENEFITS_MODE && row.settings?.mode) {
              setHomeMode(row.settings.mode);
            }
          });

          setModules(INITIAL_MODULES.map(m => ({
            ...m,
            enabled: map[m.id] !== undefined ? map[m.id] : m.enabled
          })));
          localStorage.setItem('vetpro_modules_config', JSON.stringify(map));
        } else {
          const saved = localStorage.getItem('vetpro_modules_config');
          if (saved) {
            const parsed = JSON.parse(saved);
            setModules(INITIAL_MODULES.map(m => ({
              ...m,
              enabled: parsed[m.id] !== undefined ? parsed[m.id] : m.enabled
            })));
          }
        }
      } else {
        const saved = localStorage.getItem('vetpro_modules_config');
        if (saved) {
          const parsed = JSON.parse(saved);
          setModules(INITIAL_MODULES.map(m => ({
            ...m,
            enabled: parsed[m.id] !== undefined ? parsed[m.id] : m.enabled
          })));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetHomeMode = async (newMode: HomeAdvantagesMode) => {
    setHomeMode(newMode);
    setSavingHomeMode(true);
    try {
      await setHomeAdvantagesMode(newMode);
      await fetch('/api/admin/home-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ advantages_mode: newMode })
      });
      showToast(
        newMode === 'benefits' 
          ? 'Home atualizada: Modo "Benefícios Exclusivos VetPro" ativado!'
          : newMode === 'comparison'
          ? 'Home atualizada: Modo "Comparativo VetPro vs. Google" ativado!'
          : 'Seção de vantagens desativada na Home!',
        'success'
      );
    } catch (err: any) {
      showToast(`Erro ao alterar modo da Home: ${err.message}`, 'error');
    } finally {
      setSavingHomeMode(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) {
        await loadModules();
      }
    };
    void fetchAsync();
    return () => {
      isMounted = false;
    };
  }, [selectedTenant]);

  const handleToggle = (id: string) => {
    const updated = modules.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    );
    setModules(updated);
  };

  const handleSaveModules = async () => {
    setSaving(true);
    try {
      const configMap: Record<string, boolean> = {};
      modules.forEach(m => {
        configMap[m.id] = m.enabled;
      });
      localStorage.setItem('vetpro_modules_config', JSON.stringify(configMap));

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vetpro_modules_changed'));
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        
        // Obter primeiro tenant ou usar global
        const { data: tenantsData } = await supabase.from('tenants').select('id').limit(1).maybeSingle();
        const targetTenantId = tenantsData?.id;

        if (targetTenantId) {
          for (const mod of modules) {
            await supabase.from('tenant_modules').upsert({
              tenant_id: targetTenantId,
              module_key: mod.id,
              enabled: mod.enabled,
              updated_at: new Date().toISOString()
            }, { onConflict: 'tenant_id,module_key' });
          }
        }
        showToast('Módulos sincronizados e salvos no Supabase com sucesso!');
      } else {
        showToast('Configurações dos módulos salvas localmente!');
      }
    } catch (err: any) {
      console.error('Erro ao salvar no Supabase:', err);
      showToast(`Salvo localmente! (Supabase: ${err.message})`, 'success');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg relative">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200 ${
          toastMessage.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-teal text-brand-bg'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Recursos Modulares & Integrações
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Gestão de Módulos & Recursos</h1>
            <p className="text-brand-text-muted text-sm">
              Habilite ou desabilite recursos clínicos e integrações, persistindo as preferências no Supabase.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadModules}
              disabled={loading}
              className="p-2.5 bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 rounded-full transition-colors"
              title="Recarregar do Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={handleSaveModules}
              disabled={saving}
              className="bg-brand-teal text-brand-bg font-bold px-6 py-2.5 rounded-full text-xs flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md shrink-0 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar no Supabase'}
            </button>
          </div>
        </div>

        {/* Supabase Status Banner */}
        <SupabaseStatusBanner />

        {/* Scope Selector */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-brand-teal shrink-0" />
            <div>
              <div className="text-xs font-bold text-brand-text">Escopo de Aplicação</div>
              <div className="text-[11px] text-brand-text-muted">Selecione para aplicar a todas as clínicas ou a uma unidade específica</div>
            </div>
          </div>

          <select 
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2 text-xs font-semibold text-brand-text focus:outline-none focus:border-brand-teal"
          >
            <option value="global">🌐 Todas as Clínicas (Configuração Global Padrão)</option>
            <option value="tenant-1">Clínica Veterinária São Francisco</option>
            <option value="tenant-2">Hospital Veterinário PetCare 24h</option>
            <option value="tenant-4">Clínica Amigo Fiel</option>
          </select>
        </div>

        {/* Card Especial: Seletor de Apresentação da Home (Benefícios vs. Comparativo Google) */}
        <div className="bg-gradient-to-br from-brand-surface to-brand-surface-2 border-2 border-brand-teal/40 rounded-3xl p-6 md:p-7 mb-8 shadow-xl shadow-brand-teal/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/15 text-brand-teal text-[11px] font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5 text-brand-teal" /> Controle de Conversão na Home
              </div>
              <h2 className="font-display font-bold text-lg md:text-xl text-brand-text mb-2">
                Apresentação da Seção de Vantagens da Home
              </h2>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Alterne instantaneamente o que os visitantes e tutores visualizam na landing page principal. Você pode exibir os <strong>Benefícios Exclusivos da VetPro</strong>, o <strong>Comparativo com o Google</strong> ou ocultar a seção.
              </p>
            </div>

            {/* Controles de Alternância */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              
              {/* Opção 1: Benefícios VetPro */}
              <button
                type="button"
                onClick={() => handleSetHomeMode('benefits')}
                disabled={savingHomeMode}
                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2.5 justify-center ${
                  homeMode === 'benefits'
                    ? 'bg-brand-teal text-brand-bg border-brand-teal shadow-lg shadow-brand-teal/20 scale-[1.02]'
                    : 'bg-brand-surface border-brand-border-strong text-brand-text hover:bg-brand-surface-2'
                }`}
              >
                <CheckCircle2 className={`w-4 h-4 ${homeMode === 'benefits' ? 'text-brand-bg' : 'text-brand-teal'}`} />
                <div className="text-left">
                  <div>Benefícios Diretos</div>
                  <div className="text-[10px] font-normal opacity-80">Sem comparativo</div>
                </div>
              </button>

              {/* Opção 2: Comparativo Google */}
              <button
                type="button"
                onClick={() => handleSetHomeMode('comparison')}
                disabled={savingHomeMode}
                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2.5 justify-center ${
                  homeMode === 'comparison'
                    ? 'bg-brand-surface border-[#4285F4] text-brand-text shadow-lg shadow-[#4285F4]/20 ring-2 ring-[#4285F4]/40 scale-[1.02]'
                    : 'bg-brand-surface border-brand-border-strong text-brand-text hover:bg-brand-surface-2'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-[#4285F4] shadow-xs">
                  G
                </div>
                <div className="text-left">
                  <div>Versus Google</div>
                  <div className="text-[10px] font-normal opacity-80">Quadro comparativo</div>
                </div>
              </button>

              {/* Opção 3: Ocultar Seção */}
              <button
                type="button"
                onClick={() => handleSetHomeMode('hidden')}
                disabled={savingHomeMode}
                className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border flex items-center gap-2.5 justify-center ${
                  homeMode === 'hidden'
                    ? 'bg-zinc-800 text-white border-zinc-600 shadow-md scale-[1.02]'
                    : 'bg-brand-surface border-brand-border-strong text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2'
                }`}
              >
                <EyeOff className="w-4 h-4" />
                <div className="text-left">
                  <div>Ocultar Seção</div>
                  <div className="text-[10px] font-normal opacity-80">Desativa o bloco</div>
                </div>
              </button>

            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-brand-border-strong/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-brand-text-muted gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
              <span>Status Atual na Home: <strong className="text-brand-text font-semibold">
                {homeMode === 'benefits' ? '★ Modo Benefícios Diretos Ativo (Recomendado)' : homeMode === 'comparison' ? '⇄ Modo Comparativo VetPro vs Google Ativo' : '✕ Seção Oculta na Home'}
              </strong></span>
            </div>
            <a
              href="/#vantagens"
              target="_blank"
              className="text-brand-teal hover:underline font-bold flex items-center gap-1"
            >
              <span>Ver como está na Home</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.id}
                className={`bg-brand-surface border rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between ${
                  mod.enabled ? 'border-brand-border-strong hover:border-brand-teal/40' : 'border-brand-border-strong/60 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        mod.enabled ? 'bg-brand-teal/15 text-brand-teal border border-brand-teal/30' : 'bg-brand-surface-2 text-brand-text-muted'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                          {mod.category}
                        </div>
                        <h3 className="font-bold text-brand-text text-sm">{mod.name}</h3>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggle(mod.id)}
                      className={`w-12 h-6 rounded-full relative transition-colors shrink-0 focus:outline-none ${
                        mod.enabled ? 'bg-brand-teal' : 'bg-brand-surface-2 border border-brand-border-strong'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full transition-transform absolute top-1 ${
                        mod.enabled ? 'bg-brand-bg right-1' : 'bg-brand-text-muted left-1'
                      }`} />
                    </button>
                  </div>

                  <p className="text-xs text-brand-text-muted leading-relaxed mb-4">
                    {mod.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-brand-border-strong text-[11px]">
                  {mod.requiresSuperAdmin ? (
                    <span className="text-amber-400 flex items-center gap-1 font-semibold">
                      <Crown className="w-3.5 h-3.5" /> Exclusivo Super Admin
                    </span>
                  ) : mod.requiresCrmv ? (
                    <span className="text-blue-400 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" /> Requer CRMV do médico veterinário
                    </span>
                  ) : (
                    <span className="text-brand-text-muted">Disponível para todos os perfis</span>
                  )}
                  
                  <span className={`font-semibold ${mod.enabled ? 'text-brand-teal' : 'text-brand-text-muted'}`}>
                    {mod.enabled ? 'Ativado' : 'Desativado'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
