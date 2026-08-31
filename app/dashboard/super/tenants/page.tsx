'use client';

import { useState, useEffect } from 'react';
import { 
  Building, Plus, Search, CheckCircle2, AlertCircle, ExternalLink, 
  ShieldCheck, MoreVertical, Edit2, RefreshCw, X, Trash2
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
  customPrompt?: string;
  createdAt?: string;
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
    createdAt: '15/01/2025'
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
    createdAt: '02/03/2025'
  },
  {
    id: 'tenant-3',
    name: 'VetPro Global (Sistema Principal)',
    owner: 'Marcelo (Super Admin)',
    email: 'marcelobfo@gmail.com',
    phone: '(11) 99999-8888',
    planName: 'Super Admin Core',
    status: 'active',
    createdAt: '10/01/2025'
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
    createdAt: '22/08/2026'
  }
];

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantItem[]>(DEFAULT_TENANTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
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
  const [planName, setPlanName] = useState('VetPro Starter');
  const [status, setStatus] = useState<'active' | 'pending' | 'suspended'>('active');
  const [customPrompt, setCustomPrompt] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadTenants = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('tenants')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Erro ao ler tenants do Supabase:', error.message);
          const saved = localStorage.getItem('vetpro_tenants_list');
          if (saved) setTenants(JSON.parse(saved));
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
            customPrompt: t.custom_prompt || '',
            createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('pt-BR') : ''
          }));
          setTenants(mapped);
          localStorage.setItem('vetpro_tenants_list', JSON.stringify(mapped));
        } else {
          const saved = localStorage.getItem('vetpro_tenants_list');
          if (saved) setTenants(JSON.parse(saved));
        }
      } else {
        const saved = localStorage.getItem('vetpro_tenants_list');
        if (saved) setTenants(JSON.parse(saved));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) {
        await loadTenants();
      }
    };
    void fetchAsync();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenNewModal = () => {
    setEditingTenant(null);
    setName('');
    setOwner('');
    setEmail('');
    setPhone('');
    setCnpj('');
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
    setPlanName(t.planName || 'VetPro Starter');
    setStatus(t.status);
    setCustomPrompt(t.customPrompt || '');
    setIsModalOpen(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tenantData: Partial<TenantItem> = {
      name,
      owner,
      email,
      phone,
      cnpj,
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
        planName,
        status,
        customPrompt,
        createdAt: new Date().toLocaleDateString('pt-BR')
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
    (t.cnpj && t.cnpj.includes(searchTerm))
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
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Multi-Tenant Core
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Todas as Clínicas (Tenants)</h1>
            <p className="text-brand-text-muted text-sm">
              Gestão centralizada de instâncias, planos comerciais e prompts isolados por clínica.
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
                placeholder="Buscar por nome da clínica, e-mail ou CNPJ..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text" 
              />
            </div>
            <div className="text-xs text-brand-text-muted font-medium">
              Total: {tenants.length} clínicas cadastradas
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-brand-surface-2/60 text-brand-text-muted border-b border-brand-border-strong text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Clínica / Razão Social</th>
                  <th className="px-6 py-4">Responsável & Contato</th>
                  <th className="px-6 py-4">Plano Contratado</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-strong text-xs">
                {filteredTenants.map((t) => (
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
                      <div className="text-brand-text font-medium">{t.owner}</div>
                      <div className="text-xs text-brand-text-muted">{t.email} {t.phone ? `• ${t.phone}` : ''}</div>
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
                          title="Editar Clínica"
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
                ))}
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
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                  />
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
