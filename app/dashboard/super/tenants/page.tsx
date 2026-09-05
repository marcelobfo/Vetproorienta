'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Building, Plus, Search, CheckCircle2, AlertCircle, ExternalLink, 
  ShieldCheck, MoreVertical, Edit2, RefreshCw, X, Trash2, Globe,
  Link as LinkIcon, Copy, Check, Sparkles, Users, ArrowRight
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';

export interface TenantItem {
  id: string;
  name: string;
  owner?: string;
  email?: string;
  phone?: string;
  planName?: string;
  status: 'active' | 'pending' | 'suspended';
  cnpj?: string;
  subdomain?: string;
  customDomain?: string;
  customPrompt?: string;
  createdAt?: string;
  tutorsCount?: number;
}

const DEFAULT_TENANTS: TenantItem[] = [
  {
    id: 'tenant-1',
    name: 'Clínica Veterinária São Francisco',
    owner: 'Dr. Roberto Mendes',
    email: 'roberto@saovet.com.br',
    phone: '(11) 98765-4321',
    planName: 'VetPro Master',
    status: 'active',
    cnpj: '12.345.678/0001-90',
    subdomain: 'sao-francisco',
    customDomain: 'atendimento.saofranciscovet.com.br',
    createdAt: '15/01/2025',
    tutorsCount: 1
  },
  {
    id: 'tenant-2',
    name: 'Hospital Veterinário PetCare 24h',
    owner: 'Dra. Camila Vasconcelos',
    email: 'contato@petcare24.com',
    phone: '(21) 99888-7766',
    planName: 'VetPro Enterprise',
    status: 'active',
    cnpj: '98.765.432/0001-10',
    subdomain: 'petcare-24h',
    customDomain: 'portal.petcare24.com.br',
    createdAt: '02/03/2025',
    tutorsCount: 1
  },
  {
    id: 'tenant-3',
    name: 'VetPro Global (Sistema Principal)',
    owner: 'Marcelo (Super Admin)',
    email: 'marcelobfo@gmail.com',
    phone: '(11) 99999-8888',
    planName: 'Super Admin Core',
    status: 'active',
    subdomain: 'app',
    customDomain: 'app.vetproorienta.com.br',
    createdAt: '10/01/2025',
    tutorsCount: 0
  },
  {
    id: 'tenant-4',
    name: 'Clínica Amigo Fiel',
    owner: 'Dr. Fernando Lima',
    email: 'fernando@amigofiel.vet',
    phone: '(31) 91122-3344',
    planName: 'VetPro Starter',
    status: 'pending',
    cnpj: '33.444.555/0001-22',
    subdomain: 'amigo-fiel',
    createdAt: '22/08/2026',
    tutorsCount: 0
  }
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>(DEFAULT_TENANTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);

  // Form
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [planName, setPlanName] = useState('VetPro Starter');
  const [status, setStatus] = useState<'active' | 'pending' | 'suspended'>('active');
  const [customPrompt, setCustomPrompt] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingTenant && !subdomain) {
      setSubdomain(generateSlug(val));
    }
  };

  const handleCopyTenantDomain = (t: TenantItem) => {
    const domainText = t.customDomain 
      ? `https://${t.customDomain}` 
      : `https://${t.subdomain || generateSlug(t.name)}.vetproorienta.com.br`;
    navigator.clipboard.writeText(domainText);
    setCopiedTenantId(t.id);
    showToast(`Domínio copiado: ${domainText}`);
    setTimeout(() => setCopiedTenantId(null), 3000);
  };

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Carrega contagem de tutores de localStorage como base
      const tutorCounts: Record<string, number> = {};
      const savedTutorsRaw = localStorage.getItem('vetpro_cadastros_tutors');
      if (savedTutorsRaw) {
        try {
          const parsedTutors = JSON.parse(savedTutorsRaw);
          if (Array.isArray(parsedTutors)) {
            parsedTutors.forEach((tut: any) => {
              const tid = tut.tenantId || tut.tenant_id;
              if (tid) {
                tutorCounts[tid] = (tutorCounts[tid] || 0) + 1;
              }
            });
          }
        } catch (e) {
          console.warn('Erro ao processar tutores locais:', e);
        }
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });

        // Busca contagem real de tutores por tenant do Supabase
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, tenant_id, role');

        if (userProfiles && userProfiles.length > 0) {
          // Limpa e recalcula com base no banco real
          Object.keys(tutorCounts).forEach(k => delete tutorCounts[k]);
          userProfiles.forEach((u: any) => {
            if (u.tenant_id && (u.role === 'tutor' || !u.role || u.role === 'client')) {
              tutorCounts[u.tenant_id] = (tutorCounts[u.tenant_id] || 0) + 1;
            }
          });
        }

        if (error) {
          console.warn('Erro ao ler tenants do Supabase:', error.message);
          const saved = localStorage.getItem('vetpro_tenants_list');
          if (saved) {
            const parsed = JSON.parse(saved);
            const recalculated = parsed.map((t: TenantItem) => ({
              ...t,
              tutorsCount: tutorCounts[t.id] ?? t.tutorsCount ?? 0,
            }));
            setTenants(recalculated);
          }
        } else if (data && data.length > 0) {
          const mapped: TenantItem[] = data.map((t: any) => ({
            id: t.id,
            name: t.name,
            owner: t.owner_name || 'Admin',
            email: t.email || '',
            phone: t.phone || '',
            planName: t.plan_name || 'VetPro Starter',
            status: t.status || 'active',
            cnpj: t.cnpj || '',
            subdomain: t.subdomain || generateSlug(t.name || ''),
            customDomain: t.custom_domain || '',
            customPrompt: t.custom_prompt || '',
            createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : '',
            tutorsCount: tutorCounts[t.id] || 0,
          }));
          setTenants(mapped);
          localStorage.setItem('vetpro_tenants_list', JSON.stringify(mapped));
        } else {
          const saved = localStorage.getItem('vetpro_tenants_list');
          if (saved) {
            const parsed = JSON.parse(saved);
            const recalculated = parsed.map((t: TenantItem) => ({
              ...t,
              tutorsCount: tutorCounts[t.id] ?? t.tutorsCount ?? 0,
            }));
            setTenants(recalculated);
          }
        }
      } else {
        const saved = localStorage.getItem('vetpro_tenants_list');
        if (saved) {
          const parsed = JSON.parse(saved);
          const recalculated = parsed.map((t: TenantItem) => ({
            ...t,
            tutorsCount: tutorCounts[t.id] ?? t.tutorsCount ?? 0,
          }));
          setTenants(recalculated);
        } else {
          const withCounts = DEFAULT_TENANTS.map(t => ({
            ...t,
            tutorsCount: tutorCounts[t.id] ?? t.tutorsCount ?? 0,
          }));
          setTenants(withCounts);
          localStorage.setItem('vetpro_tenants_list', JSON.stringify(withCounts));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) {
        await loadTenants();
      }
    };
    void fetchAsync();

    const handleSync = () => {
      if (isMounted) {
        void loadTenants();
      }
    };
    window.addEventListener('vetpro_tutors_updated', handleSync);
    window.addEventListener('vetpro_tenants_updated', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('vetpro_tutors_updated', handleSync);
      window.removeEventListener('vetpro_tenants_updated', handleSync);
    };
  }, [loadTenants]);

  const handleOpenNewModal = () => {
    setEditingTenant(null);
    setName('');
    setOwner('');
    setEmail('');
    setPhone('');
    setCnpj('');
    setSubdomain('');
    setCustomDomain('');
    setPlanName('VetPro Starter');
    setStatus('active');
    setCustomPrompt('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: TenantItem) => {
    setEditingTenant(t);
    setName(t.name);
    setOwner(t.owner || '');
    setEmail(t.email || '');
    setPhone(t.phone || '');
    setCnpj(t.cnpj || '');
    setSubdomain(t.subdomain || generateSlug(t.name));
    setCustomDomain(t.customDomain || '');
    setPlanName(t.planName || 'VetPro Starter');
    setStatus(t.status);
    setCustomPrompt(t.customPrompt || '');
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalSubdomain = subdomain.trim() ? generateSlug(subdomain) : generateSlug(name);

    const tenantData: Partial<TenantItem> = {
      name,
      owner,
      email,
      phone,
      cnpj,
      subdomain: finalSubdomain,
      customDomain: customDomain.trim(),
      planName,
      status,
      customPrompt
    };

    let updatedTenants: TenantItem[];

    if (editingTenant) {
      updatedTenants = tenants.map(t => t.id === editingTenant.id ? { ...t, ...tenantData } : t);
    } else {
      const newT: TenantItem = {
        id: `tenant-${Date.now()}`,
        name,
        owner,
        email,
        phone,
        cnpj,
        subdomain: finalSubdomain,
        customDomain: customDomain.trim(),
        planName,
        status,
        customPrompt,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        tutorsCount: 0,
      };
      updatedTenants = [newT, ...tenants];
    }

    setTenants(updatedTenants);
    localStorage.setItem('vetpro_tenants_list', JSON.stringify(updatedTenants));

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const payload: any = {
          name,
          owner_name: owner,
          email,
          phone,
          cnpj,
          subdomain: finalSubdomain,
          custom_domain: customDomain.trim() || null,
          plan_name: planName,
          status,
          custom_prompt: customPrompt
        };

        if (editingTenant && !editingTenant.id.startsWith('tenant-')) {
          await supabase.from('tenants').update(payload).eq('id', editingTenant.id);
        } else {
          await supabase.from('tenants').insert([payload]);
        }
        showToast('Clínica salva no Supabase com sucesso!');
        loadTenants();
      } catch (err: any) {
        console.error(err);
        showToast(`Salvo localmente! Supabase: ${err.message}`, 'success');
      }
    } else {
      showToast('Clínica salva com sucesso!');
    }

    setIsModalOpen(false);
  };

  const handleDeleteTenant = async (id: string, tenantName: string) => {
    if (!confirm(`Deseja realmente remover a clínica "${tenantName}"?`)) return;

    const updated = tenants.filter(t => t.id !== id);
    setTenants(updated);
    localStorage.setItem('vetpro_tenants_list', JSON.stringify(updated));

    if (isSupabaseConfigured() && !id.startsWith('tenant-')) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('tenants').delete().eq('id', id);
        showToast('Clínica removida do Supabase.');
      } catch (err) {
        console.error(err);
      }
    } else {
      showToast('Clínica removida.');
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.cnpj && t.cnpj.includes(searchTerm)) ||
    (t.subdomain && t.subdomain.includes(searchTerm))
  );

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

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Multi-Tenant & Domínios
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Todas as Clínicas (Tenants)</h1>
            <p className="text-brand-text-muted text-sm">
              Gestão centralizada de instâncias, domínios individuais, planos comerciais e tutores alocados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadTenants}
              disabled={loading}
              className="p-2.5 bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 rounded-full transition-colors"
              title="Recarregar do Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={handleOpenNewModal}
              className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" /> Nova Clínica
            </button>
          </div>
        </div>

        {/* Supabase Status Banner */}
        <SupabaseStatusBanner />

        {/* Search */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden shadow-sm mb-6">
          <div className="p-4 border-b border-brand-border-strong bg-brand-surface-2/30 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input 
                type="text" 
                placeholder="Buscar por clínica, subdomínio, e-mail ou CNPJ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text" 
              />
            </div>
            <div className="text-xs text-brand-text-muted font-medium flex items-center gap-3">
              <span>Total: {tenants.length} clínicas cadastradas</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-brand-surface-2/60 text-brand-text-muted border-b border-brand-border-strong text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Clínica / Razão Social</th>
                  <th className="px-6 py-4">Domínio / Sessão Individual</th>
                  <th className="px-6 py-4">Responsável & Contato</th>
                  <th className="px-6 py-4">Tutores Alocados</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-strong text-xs">
                {filteredTenants.map((t) => {
                  const subDomainText = `${t.subdomain || generateSlug(t.name)}.vetproorienta.com.br`;
                  return (
                    <tr key={t.id} className="hover:bg-brand-surface-2/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-brand-text text-sm flex items-center gap-2">
                          <Building className="w-4 h-4 text-brand-teal" />
                          {t.name}
                        </div>
                        {t.cnpj && (
                          <div className="text-xs text-brand-text-muted mt-0.5 font-mono">CNPJ: {t.cnpj}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-brand-teal bg-brand-teal/10 px-2 py-1 rounded-lg border border-brand-teal/20 w-fit">
                            <Globe className="w-3 h-3" />
                            <span>{subDomainText}</span>
                            <button
                              onClick={() => handleCopyTenantDomain(t)}
                              className="hover:text-brand-text p-0.5"
                              title="Copiar URL do Tenant"
                            >
                              {copiedTenantId === t.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          {t.customDomain && (
                            <div className="text-[10px] text-brand-text-muted font-mono flex items-center gap-1">
                              <span>Custom: {t.customDomain}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-brand-text font-medium">{t.owner}</div>
                        <div className="text-xs text-brand-text-muted">{t.email} {t.phone ? `• ${t.phone}` : ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/20">
                          <Users className="w-3.5 h-3.5" />
                          {t.tutorsCount || 0} tutores
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-purple-500/15 text-purple-400 font-bold px-2.5 py-1 rounded-lg text-xs border border-purple-500/30">
                          {t.planName || 'VetPro Starter'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                          t.status === 'active' 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                            : t.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-brand-danger/15 text-brand-danger border border-brand-danger/30'
                        }`}>
                          {t.status === 'active' ? 'Ativa' : t.status === 'pending' ? 'Pendente' : 'Suspensa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => handleOpenEditModal(t)}
                            className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 rounded-lg transition-colors"
                            title="Editar Clínica e Domínio"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteTenant(t.id, t.name)}
                            className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                            title="Excluir Clínica"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Criação / Edição */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold">
                  {editingTenant ? `Editar Clínica: ${editingTenant.name}` : 'Cadastrar Nova Clínica (Tenant)'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-brand-text-muted hover:text-brand-text rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTenant} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Nome da Clínica / Razão Social</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Clínica Veterinária São Francisco"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                  />
                </div>

                {/* Subdomínio e Domínio Customizado */}
                <div className="p-3.5 rounded-xl bg-brand-surface-2/60 border border-brand-teal/20 space-y-3">
                  <div className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                    <Globe className="w-4 h-4" /> Configuração de Domínio & Sessão Individual
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1">Subdomínio do Tenant (Slug)</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        required
                        placeholder="sao-francisco"
                        value={subdomain}
                        onChange={(e) => setSubdomain(generateSlug(e.target.value))}
                        className="w-full bg-brand-surface border border-brand-border-strong rounded-xl px-3 py-2 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                      />
                      <span className="text-[11px] font-mono text-brand-text-muted shrink-0">.vetproorienta.com.br</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1">Domínio Personalizado (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: atendimento.saofranciscovet.com.br"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full bg-brand-surface border border-brand-border-strong rounded-xl px-3 py-2 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Nome do Responsável / Diretor</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Dr. Roberto Mendes"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">CNPJ</label>
                    <input 
                      type="text" 
                      placeholder="00.000.000/0001-00"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">E-mail Principal</label>
                    <input 
                      type="email" 
                      placeholder="contato@clinica.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="(11) 99999-9999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Plano Contratado</label>
                    <select 
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    >
                      <option value="VetPro Starter">VetPro Starter (R$ 199/mês)</option>
                      <option value="VetPro Pro">VetPro Pro (R$ 399/mês)</option>
                      <option value="VetPro Master">VetPro Master (R$ 799/mês)</option>
                      <option value="VetPro Enterprise">VetPro Enterprise (Custom)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Status</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    >
                      <option value="active">Ativa</option>
                      <option value="pending">Pendente</option>
                      <option value="suspended">Suspensa</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Prompt Customizado da IA (Opcional)</label>
                  <textarea 
                    rows={3}
                    placeholder="Instruções específicas para os tutores desta clínica..."
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl p-3 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border-strong">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs text-brand-text-muted hover:text-brand-text"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-brand-teal/90 shadow-md"
                  >
                    {editingTenant ? 'Salvar Alterações' : 'Criar Clínica'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
