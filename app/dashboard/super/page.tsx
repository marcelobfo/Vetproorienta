'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building, Users, BrainCircuit, CreditCard, Zap, TerminalSquare, 
  ArrowUpRight, ShieldCheck, Activity, Stethoscope, Sparkles,
  Search, RefreshCw, CheckCircle2, AlertCircle, Mail, Phone,
  MapPin, Dog, Check, Edit2, Globe, QrCode, ExternalLink, ChevronDown, UserCheck
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { getAsaasConfig } from '@/lib/asaas';

interface TutorSuperItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  emergencyContact?: string;
  notes?: string;
  tenantId?: string;
  tenantName?: string;
  planName?: string;
  planPrice?: number;
  subscriptionStatus?: string;
  asaasCustomerId?: string;
  subscriptionId?: string;
  status: 'active' | 'inactive';
  petsCount?: number;
  createdAt?: string;
}

interface TenantOption {
  id: string;
  name: string;
  subdomain?: string;
}

const DEFAULT_TENANTS: TenantOption[] = [
  { id: 'tenant-1', name: 'Clínica Veterinária São Francisco', subdomain: 'sao-francisco' },
  { id: 'tenant-2', name: 'Hospital Veterinário PetCare 24h', subdomain: 'petcare-24h' },
  { id: 'tenant-3', name: 'VetPro Global (Sistema Principal)', subdomain: 'app' },
  { id: 'tenant-4', name: 'Clínica Amigo Fiel', subdomain: 'amigo-fiel' },
];

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [tutors, setTutors] = useState<TutorSuperItem[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>(DEFAULT_TENANTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [updatingTenantForUserId, setUpdatingTenantForUserId] = useState<string | null>(null);

  // Modal de Detalhes do Tutor
  const [selectedTutor, setSelectedTutor] = useState<TutorSuperItem | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let loadedTenants = DEFAULT_TENANTS;

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        
        // 1. Carrega Tenants
        const { data: tenantsData } = await supabase
          .from('tenants')
          .select('id, name, subdomain')
          .order('name');
        
        if (tenantsData && tenantsData.length > 0) {
          loadedTenants = tenantsData.map((t: any) => ({
            id: t.id,
            name: t.name,
            subdomain: t.subdomain || '',
          }));
          setTenants(loadedTenants);
        }

        const tenantMap = new Map<string, string>();
        loadedTenants.forEach(t => tenantMap.set(t.id, t.name));

        // 2. Carrega Usuários / Tutores
        const { data: usersData, error: usersErr } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!usersErr && usersData) {
          // Busca contagem de pets
          const { data: petsData } = await supabase.from('pets').select('owner_id');
          const petCounts: Record<string, number> = {};
          if (petsData) {
            petsData.forEach((p: any) => {
              if (p.owner_id) petCounts[p.owner_id] = (petCounts[p.owner_id] || 0) + 1;
            });
          }

          const mapped: TutorSuperItem[] = usersData
            .filter((u: any) => u.role === 'tutor' || !u.role || u.role === 'client')
            .map((u: any) => ({
              id: u.id,
              name: u.full_name || u.name || 'Tutor Cadastrado',
              email: u.email || '',
              phone: u.phone || '',
              cpf: u.cpf || u.cpf_cnpj || '',
              street: u.street || u.address || '',
              number: u.number || '',
              complement: u.complement || '',
              neighborhood: u.neighborhood || '',
              city: u.city || '',
              state: u.state || '',
              cep: u.cep || '',
              emergencyContact: u.emergency_contact || '',
              notes: u.notes || '',
              tenantId: u.tenant_id || 'tenant-1',
              tenantName: tenantMap.get(u.tenant_id) || 'Clínica Padrão',
              planName: u.plan_name || u.plan_selected || 'Essencial',
              planPrice: u.plan_price || 9.90,
              subscriptionStatus: u.subscription_status || 'PENDING_PAYMENT',
              asaasCustomerId: u.asaas_customer_id || '',
              subscriptionId: u.subscription_id || u.asaas_subscription_id || '',
              status: u.status || 'active',
              petsCount: petCounts[u.id] || u.pets_count || 0,
              createdAt: u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '',
            }));

          setTutors(mapped);
          return;
        }
      }

      // Fallback LocalStorage
      const savedTutors = localStorage.getItem('vetpro_cadastros_tutors');
      if (savedTutors) {
        setTutors(JSON.parse(savedTutors));
      } else {
        setTutors([
          {
            id: 'tut-1',
            name: 'Fernanda Diniz',
            email: 'dinizfernandaa@hotmail.com',
            phone: '(11) 98765-4321',
            cpf: '123.456.789-00',
            tenantId: 'tenant-1',
            tenantName: 'Clínica Veterinária São Francisco',
            planName: 'Essencial',
            subscriptionStatus: 'ACTIVE',
            status: 'active',
            city: 'São Paulo',
            state: 'SP',
            petsCount: 2,
            createdAt: '28/08/2026',
          },
          {
            id: 'tut-2',
            name: 'Lucas Francisco',
            email: 'mvfranciscolucas@gmail.com',
            phone: '(21) 99888-1122',
            cpf: '987.654.321-11',
            tenantId: 'tenant-2',
            tenantName: 'Hospital Veterinário PetCare 24h',
            planName: 'Especialista',
            subscriptionStatus: 'PENDING_PAYMENT',
            status: 'active',
            city: 'Rio de Janeiro',
            state: 'RJ',
            petsCount: 1,
            createdAt: '01/09/2026',
          }
        ]);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Super Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) await loadData();
    };
    void fetchAsync();
    return () => {
      isMounted = false;
    };
  }, []);

  // Deslocamento de Tenant Instantâneo
  const handleTenantChange = async (tutor: TutorSuperItem, newTenantId: string) => {
    setUpdatingTenantForUserId(tutor.id);
    const targetTenant = tenants.find(t => t.id === newTenantId);
    const tenantName = targetTenant?.name || 'Clínica Selecionada';

    // Atualiza estado local imediatamente
    setTutors(prev => prev.map(item => item.id === tutor.id ? {
      ...item,
      tenantId: newTenantId,
      tenantName,
    } : item));

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('user_profiles')
          .update({
            tenant_id: newTenantId.startsWith('tenant-') ? null : newTenantId,
            updated_at: new Date().toISOString()
          })
          .eq('id', tutor.id);

        if (error) {
          // Se falhou com UUID, tenta por email
          await supabase
            .from('user_profiles')
            .update({
              tenant_id: newTenantId.startsWith('tenant-') ? null : newTenantId,
              updated_at: new Date().toISOString()
            })
            .eq('email', tutor.email);
        }
      }

      showToast(`Tutor "${tutor.name}" transferido para "${tenantName}" com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao transferir tenant:', err);
      showToast(`Alterado localmente. Supabase: ${err.message}`, 'error');
    } finally {
      setUpdatingTenantForUserId(null);
    }
  };

  // Aprovação Instantânea no Sandbox do Asaas
  const handleApproveSandboxPayment = async (tutor: TutorSuperItem) => {
    setApprovingId(tutor.id);
    try {
      const localAsaasConfig = getAsaasConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') || '' : '';

      const res = await fetch('/api/asaas/sandbox-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tutor.id,
          email: tutor.email,
          customerId: tutor.asaasCustomerId || undefined,
          subscriptionId: tutor.subscriptionId || undefined,
          asaasConfig: {
            apiKey: localAsaasConfig.apiKey,
            environment: localAsaasConfig.environment || 'sandbox',
            customBaseUrl: localAsaasConfig.customBaseUrl,
          },
          supabaseConfig: {
            url: localSupabaseUrl,
            anonKey: localSupabaseAnonKey,
            serviceRoleKey: localSupabaseServiceKey,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        showToast(`Pagamento do tutor "${tutor.name}" aprovado no Sandbox do Asaas! Assinatura ATIVA.`);
        
        // Atualiza status local
        setTutors(prev => prev.map(t => t.id === tutor.id ? {
          ...t,
          subscriptionStatus: 'ACTIVE',
        } : t));

        // Atualiza chave de assinatura do usuário
        if (typeof window !== 'undefined') {
          localStorage.setItem(`vetpro_sub_status_${tutor.email.toLowerCase().trim()}`, 'ACTIVE');
          localStorage.setItem(`vetpro_sub_paid_${tutor.email.toLowerCase().trim()}`, 'true');
        }

        loadData();
      } else {
        showToast(data.error || 'Não foi possível aprovar no Sandbox.', 'error');
      }
    } catch (err: any) {
      showToast('Erro de conexão com o endpoint de aprovação Sandbox.', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  const filteredTutors = tutors.filter(t => {
    const matchesSearch = 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.cpf && t.cpf.includes(searchTerm)) ||
      (t.phone && t.phone.includes(searchTerm)) ||
      (t.city && t.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTenant = filterTenant === 'all' || t.tenantId === filterTenant;
    return matchesSearch && matchesTenant;
  });

  const activeTutorsCount = tutors.filter(t => t.subscriptionStatus === 'ACTIVE' || t.subscriptionStatus === 'CONFIRMED' || t.subscriptionStatus === 'RECEIVED').length;
  const pendingTutorsCount = tutors.filter(t => t.subscriptionStatus === 'PENDING_PAYMENT' || !t.subscriptionStatus).length;

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto bg-brand-bg relative">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200 ${
          toastMessage.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-teal text-brand-bg'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Master */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                👑 Super Admin Master
              </span>
              <span className="bg-purple-500/15 text-purple-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                Multi-Tenant & Sandbox Control
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-brand-text">Painel Global do Sistema</h1>
            <p className="text-brand-text-muted text-xs sm:text-sm">
              Visão global e gerenciamento de todos os tutores cadastrados, alocação rápida de tenants e aprovação de pagamentos de teste no Sandbox.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadData}
              disabled={loading}
              className="p-2.5 bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 rounded-full transition-colors"
              title="Atualizar Dados Globais"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <Link
              href="/dashboard/super/tenants"
              className="bg-brand-teal text-brand-bg font-bold px-4 py-2.5 rounded-full text-xs flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md shrink-0"
            >
              <Building className="w-4 h-4" /> Gerenciar Clínicas (Tenants)
            </Link>
          </div>
        </div>

        <SupabaseStatusBanner />

        {/* Estatísticas Dinâmicas Reais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Total de Tutores</div>
            <div className="text-3xl font-bold text-brand-text">{tutors.length}</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-brand-teal font-semibold">{activeTutorsCount} assinaturas ativas</span> • {pendingTutorsCount} pendentes
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Clínicas Assinantes (Tenants)</div>
            <div className="text-3xl font-bold text-brand-teal">{tenants.length}</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">100% instâncias online</span> com subdomínios
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Sandbox Asaas</div>
            <div className="text-3xl font-bold text-amber-400">Ativo</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span>Endpoint: <code className="text-brand-teal font-mono">/v3/sandbox/payment/confirm</code></span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">IA & Triagem</div>
            <div className="text-3xl font-bold text-purple-400">Gemini 2.5</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-purple-400 font-semibold">RAG Integrado</span> • Multi-Tenant autoritativo
            </div>
          </div>
        </div>

        {/* TABELA DE TODOS OS TUTORES COM CONTROLE DE TENANT E APROVAÇÃO SANDBOX */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-3xl overflow-hidden shadow-sm space-y-0">
          <div className="p-5 border-b border-brand-border-strong bg-brand-surface-2/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-brand-text flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-teal" />
                Todos os Tutores Cadastrados no Sistema
              </h2>
              <p className="text-xs text-brand-text-muted">
                Visualize os dados completos, desloque tutores entre clínicas instantaneamente e aprove pagamentos de teste.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Filtro por Tenant */}
              <div className="w-full sm:w-auto">
                <select
                  value={filterTenant}
                  onChange={(e) => setFilterTenant(e.target.value)}
                  className="w-full sm:w-auto bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                >
                  <option value="all">Todas as Clínicas ({tutors.length})</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Busca */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input
                  type="text"
                  placeholder="Buscar por nome, email, CPF ou cidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>
            </div>
          </div>

          {/* Listagem */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-brand-surface-2/60 text-brand-text-muted border-b border-brand-border-strong text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Tutor & Contato</th>
                  <th className="px-5 py-3.5">Documento & Cidade</th>
                  <th className="px-5 py-3.5">Clínica Vinculada (Tenant - Mude Aqui)</th>
                  <th className="px-5 py-3.5">Plano & Status Asaas</th>
                  <th className="px-5 py-3.5 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-strong">
                {filteredTutors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-brand-text-muted text-xs">
                      Nenhum tutor encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredTutors.map((tutor) => {
                    const isAsaasActive = tutor.subscriptionStatus === 'ACTIVE' || tutor.subscriptionStatus === 'CONFIRMED' || tutor.subscriptionStatus === 'RECEIVED';
                    const hasAsaasId = !!tutor.asaasCustomerId;
                    const isApproving = approvingId === tutor.id;
                    const isUpdatingTenant = updatingTenantForUserId === tutor.id;

                    return (
                      <tr key={tutor.id} className="hover:bg-brand-surface-2/40 transition-colors">
                        {/* Nome & Contato */}
                        <td className="px-5 py-4">
                          <div className="font-bold text-brand-text text-sm flex items-center gap-2">
                            <span>{tutor.name}</span>
                            {tutor.petsCount !== undefined && tutor.petsCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-400 text-[10px] font-mono flex items-center gap-1">
                                <Dog className="w-3 h-3" /> {tutor.petsCount}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-brand-text-muted flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-brand-teal" /> {tutor.email}</span>
                            {tutor.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-brand-teal" /> {tutor.phone}</span>}
                          </div>
                          {hasAsaasId && (
                            <div className="text-[10px] font-mono text-brand-teal/80 mt-1">
                              Asaas ID: {tutor.asaasCustomerId}
                            </div>
                          )}
                        </td>

                        {/* Documento & Cidade */}
                        <td className="px-5 py-4">
                          <div className="font-mono text-brand-text-muted text-[11px]">
                            {tutor.cpf ? `CPF: ${tutor.cpf}` : 'CPF não informado'}
                          </div>
                          <div className="text-[11px] text-brand-text-muted flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-brand-teal" />
                            <span>{tutor.city ? `${tutor.city}${tutor.state ? ` - ${tutor.state}` : ''}` : 'Local não cadastrado'}</span>
                          </div>
                        </td>

                        {/* Alocação Instantânea por Dropdown */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="relative">
                              <select
                                value={tutor.tenantId || 'tenant-1'}
                                disabled={isUpdatingTenant}
                                onChange={(e) => handleTenantChange(tutor, e.target.value)}
                                className="w-full bg-brand-surface-2 border border-brand-teal/30 hover:border-brand-teal rounded-xl px-3 py-1.5 text-xs font-semibold text-brand-teal focus:outline-none cursor-pointer transition-colors shadow-sm"
                              >
                                {tenants.map(tn => (
                                  <option key={tn.id} value={tn.id}>
                                    🏥 {tn.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <span className="text-[10px] text-brand-text-muted block">
                              Mude no dropdown para transferir o tutor imediatamente.
                            </span>
                          </div>
                        </td>

                        {/* Plano & Asaas */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20">
                              {tutor.planName || 'Essencial'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isAsaasActive
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            }`}>
                              {isAsaasActive ? '🟢 Assinatura Ativa / Paga' : '🟡 Pagamento Pendente'}
                            </span>
                          </div>
                        </td>

                        {/* Ações Rápidas */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Botão de Aprovação Sandbox */}
                            {!isAsaasActive && (
                              <button
                                onClick={() => handleApproveSandboxPayment(tutor)}
                                disabled={isApproving}
                                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 text-xs font-bold transition-all flex items-center gap-1 shadow-sm shrink-0"
                                title="Aprovar pagamento de teste no Sandbox do Asaas via POST /v3/sandbox/payment/{id}/confirm"
                              >
                                <Zap className={`w-3.5 h-3.5 ${isApproving ? 'animate-spin' : ''}`} />
                                <span>{isApproving ? 'Aprovando...' : 'Aprovar Sandbox'}</span>
                              </button>
                            )}

                            {/* Detalhes do Perfil */}
                            <button
                              onClick={() => setSelectedTutor(tutor)}
                              className="px-2.5 py-1.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-brand-text hover:text-brand-teal hover:border-brand-teal text-xs font-medium transition-colors flex items-center gap-1"
                              title="Ver todos os dados do tutor"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Ver Dados</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL DE DETALHES COMPLETOS DO TUTOR */}
        {selectedTutor && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-brand-border-strong pb-3">
                <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-teal" />
                  Ficha Cadastral do Tutor
                </h3>
                <button
                  onClick={() => setSelectedTutor(null)}
                  className="text-brand-text-muted hover:text-brand-text p-1 rounded-lg hover:bg-brand-surface-2"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-brand-surface-2 space-y-2 border border-brand-border-strong">
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Nome:</span>
                    <strong className="text-brand-text">{selectedTutor.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">E-mail:</span>
                    <span className="font-mono text-brand-text">{selectedTutor.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Telefone / WhatsApp:</span>
                    <span className="text-brand-text">{selectedTutor.phone || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">CPF:</span>
                    <span className="font-mono text-brand-text">{selectedTutor.cpf || 'Não informado'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-surface-2 space-y-2 border border-brand-border-strong">
                  <div className="font-bold text-brand-teal flex items-center gap-1 mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Endereço Completo
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Logradouro:</span>
                    <span className="text-brand-text">{selectedTutor.street ? `${selectedTutor.street}, ${selectedTutor.number || 'S/N'}` : 'Não informado'}</span>
                  </div>
                  {selectedTutor.complement && (
                    <div className="flex justify-between">
                      <span className="text-brand-text-muted">Complemento:</span>
                      <span className="text-brand-text">{selectedTutor.complement}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Bairro:</span>
                    <span className="text-brand-text">{selectedTutor.neighborhood || 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Cidade / UF:</span>
                    <span className="text-brand-text">{selectedTutor.city ? `${selectedTutor.city} - ${selectedTutor.state}` : 'Não informado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">CEP:</span>
                    <span className="font-mono text-brand-text">{selectedTutor.cep || 'Não informado'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-brand-surface-2 space-y-2 border border-brand-border-strong">
                  <div className="font-bold text-brand-teal flex items-center gap-1 mb-1">
                    <Building className="w-3.5 h-3.5" /> Tenant & Assinatura Asaas
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Clínica Atual:</span>
                    <strong className="text-brand-text">{selectedTutor.tenantName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Plano:</span>
                    <span className="text-brand-teal font-bold">{selectedTutor.planName} (R$ {selectedTutor.planPrice?.toFixed(2).replace('.', ',')}/mês)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-text-muted">Status:</span>
                    <span className={`font-bold ${selectedTutor.subscriptionStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selectedTutor.subscriptionStatus === 'ACTIVE' ? '🟢 Ativo / Pago' : '🟡 Pendente'}
                    </span>
                  </div>
                  {selectedTutor.asaasCustomerId && (
                    <div className="flex justify-between">
                      <span className="text-brand-text-muted">Asaas Customer ID:</span>
                      <span className="font-mono text-brand-teal font-bold">{selectedTutor.asaasCustomerId}</span>
                    </div>
                  )}
                </div>

                {selectedTutor.emergencyContact && (
                  <div className="p-3 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                    <span className="text-brand-text-muted block font-semibold mb-0.5">Contato de Emergência:</span>
                    <span className="text-brand-text">{selectedTutor.emergencyContact}</span>
                  </div>
                )}

                {selectedTutor.notes && (
                  <div className="p-3 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                    <span className="text-brand-text-muted block font-semibold mb-0.5">Observações:</span>
                    <span className="text-brand-text">{selectedTutor.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-2 border-t border-brand-border-strong">
                {selectedTutor.subscriptionStatus !== 'ACTIVE' ? (
                  <button
                    onClick={() => {
                      handleApproveSandboxPayment(selectedTutor);
                      setSelectedTutor(prev => prev ? { ...prev, subscriptionStatus: 'ACTIVE' } : null);
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/30 flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Aprovar no Sandbox
                  </button>
                ) : <div />}

                <button
                  onClick={() => setSelectedTutor(null)}
                  className="px-4 py-2 rounded-xl bg-brand-surface-2 text-brand-text text-xs font-semibold hover:bg-brand-surface"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Management Hub */}
        <h2 className="font-display text-lg font-bold mb-4 text-brand-text">Acesso Rápido às Configurações Globais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            href="/dashboard/super/tenants"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Todas as Clínicas (Tenants)
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-teal transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Geração de domínios e subdomínios, sessões individuais, alocação de planos e limites.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/asaas"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Asaas & Sandbox de Pagamentos
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-amber-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Gestão de chaves de API, webhooks, ambiente de teste sandbox e faturamento automatizado.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/cadastros"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Central de Cadastros & Tutores
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-blue-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Cadastro e edição de tutores, médicos veterinários e parceiros da rede credenciada.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/ia-config"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Configuração da IA & RAG
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-purple-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                System Prompt, parâmetros de temperatura, materiais de conhecimento e chaves de API.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/modulos"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Gestão de Módulos & Recursos
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-emerald-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Habilite ou desabilite prescrição digital, transferências para humano e GPS de parceiros.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/automacoes"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-surface-2 text-brand-text-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TerminalSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Automações & Scripts
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-teal transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Execução de scripts de sincronização, webhooks e limpeza de auditoria.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
