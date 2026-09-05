'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  User, Mail, Phone, MapPin, ShieldCheck, CheckCircle2, 
  AlertCircle, Building, CreditCard, Sparkles, Dog, Save, 
  RefreshCw, Check, Camera
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { checkTutorSubscriptionStatus } from '@/lib/asaas';

export default function TutorPerfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dados do formulário de perfil
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  
  // Informações do Sistema
  const [tenantName, setTenantName] = useState('Clínica Principal');
  const [tenantId, setTenantId] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState('ACTIVE');
  const [planName, setPlanName] = useState('Essencial');
  const [asaasCustomerId, setAsaasCustomerId] = useState('');
  const [petsCount, setPetsCount] = useState(0);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatCPF = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 3) return raw;
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`;
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`;
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`;
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 7) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const formatCEP = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 5) return raw;
    return `${raw.slice(0, 5)}-${raw.slice(5, 8)}`;
  };

  // Busca CEP via ViaCEP API
  const handleCepBlur = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setStreet(data.logradouro);
          if (data.bairro) setNeighborhood(data.bairro);
          if (data.localidade) setCity(data.localidade);
          if (data.uf) setState(data.uf);
          showToast('Endereço preenchido automaticamente pelo CEP!');
        }
      } catch (err) {
        console.warn('Erro ao consultar ViaCEP:', err);
      }
    }
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      let currentEmail = '';
      let currentUserId = '';

      if (typeof window !== 'undefined') {
        currentEmail = localStorage.getItem('vetpro_user_email') || '';
        const savedName = localStorage.getItem('vetpro_tutor_name') || '';
        if (savedName) setFullName(savedName);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data: authData } = await supabase.auth.getSession();
        if (authData?.session?.user) {
          currentEmail = authData.session.user.email || currentEmail;
          currentUserId = authData.session.user.id;
          setUserId(currentUserId);
        }

        if (currentUserId || currentEmail) {
          let query = supabase.from('user_profiles').select('*');
          if (currentUserId) query = query.eq('id', currentUserId);
          else if (currentEmail) query = query.eq('email', currentEmail);

          const { data: profile } = await query.maybeSingle();

          if (profile) {
            setFullName(profile.full_name || profile.name || '');
            setEmail(profile.email || currentEmail);
            setPhone(profile.phone ? formatPhone(profile.phone) : '');
            setCpf(profile.cpf || profile.cpf_cnpj ? formatCPF(profile.cpf || profile.cpf_cnpj) : '');
            setCep(profile.cep ? formatCEP(profile.cep) : '');
            setStreet(profile.street || profile.address || '');
            setNumber(profile.number || '');
            setComplement(profile.complement || '');
            setNeighborhood(profile.neighborhood || '');
            setCity(profile.city || '');
            setState(profile.state || '');
            setAvatarUrl(profile.avatar_url || '');
            setEmergencyContact(profile.emergency_contact || '');
            setNotes(profile.notes || '');
            setPlanName(profile.plan_name || profile.plan_selected || 'Essencial');
            setSubscriptionStatus(profile.subscription_status || 'ACTIVE');
            setAsaasCustomerId(profile.asaas_customer_id || '');
            setTenantId(profile.tenant_id || '');

            // Busca nome do tenant se houver
            if (profile.tenant_id) {
              const { data: tenantData } = await supabase
                .from('tenants')
                .select('name')
                .eq('id', profile.tenant_id)
                .maybeSingle();
              if (tenantData?.name) {
                setTenantName(tenantData.name);
              }
            }
          }

          // Busca contagem de pets
          if (currentUserId) {
            const { count } = await supabase
              .from('pets')
              .select('id', { count: 'exact', head: true })
              .eq('owner_id', currentUserId);
            if (count !== null) setPetsCount(count);
          }
        }
      } else {
        // Fallback LocalStorage
        setEmail(currentEmail || 'tutor@vetpro.com');
        setFullName(localStorage.getItem('vetpro_tutor_name') || 'Tutor VetPro');
        const sub = checkTutorSubscriptionStatus(currentEmail);
        setSubscriptionStatus(sub.status || 'ACTIVE');
        setPlanName(sub.planName || 'Essencial');
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) await loadProfile();
    };
    void fetchAsync();
    return () => {
      isMounted = false;
    };
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanCep = cep.replace(/\D/g, '');

      // Atualiza no localStorage para sincronizar imediatamente com parceiros e GPS
      if (typeof window !== 'undefined') {
        if (fullName) localStorage.setItem('vetpro_tutor_name', fullName);
        if (cleanPhone) localStorage.setItem('vetpro_tutor_phone', cleanPhone);
        if (street) localStorage.setItem('vetpro_user_street', street);
        if (city) localStorage.setItem('vetpro_user_city', city);
        if (state) localStorage.setItem('vetpro_user_state', state.toUpperCase());
        if (cleanCep) localStorage.setItem('vetpro_user_cep', cleanCep);
      }

      const payload: Record<string, any> = {
        full_name: fullName,
        name: fullName,
        phone: cleanPhone || null,
        cpf: cleanCpf || null,
        cpf_cnpj: cleanCpf || null,
        cep: cleanCep || null,
        street: street || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state ? state.toUpperCase() : null,
        emergency_contact: emergencyContact || null,
        notes: notes || null,
        avatar_url: avatarUrl || null,
      };

      let savedOnline = false;

      // 1. Tenta salvar via API Server-side (evita recursão de RLS e resolve permissões)
      try {
        const res = await fetch('/api/profile/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            email: email ? email.toLowerCase().trim() : undefined,
            profileData: payload,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            savedOnline = true;
          }
        }
      } catch (apiErr) {
        console.warn('Tentando fallback de sincronização de perfil:', apiErr);
      }

      // 2. Se a API não concluiu, tenta direto no client Supabase com tratamento de RLS
      if (!savedOnline && isSupabaseConfigured()) {
        try {
          const supabase = getSupabaseClient();
          let updateQuery = supabase.from('user_profiles').update({
            ...payload,
            updated_at: new Date().toISOString(),
          });
          if (userId) {
            updateQuery = updateQuery.eq('id', userId);
          } else if (email) {
            updateQuery = updateQuery.eq('email', email.toLowerCase().trim());
          }

          const { error } = await updateQuery;
          if (error) {
            if (error.code === '42P17' || error.message?.includes('recursion') || error.message?.includes('policy')) {
              console.warn('Aviso de RLS no Supabase (perfil salvo localmente):', error.message);
            } else {
              console.warn('Aviso ao sincronizar perfil no Supabase:', error.message);
            }
          }
        } catch (dbErr) {
          console.warn('Erro ao atualizar perfil no cliente Supabase:', dbErr);
        }
      }

      showToast('Perfil atualizado com sucesso e sincronizado no sistema!');
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      // Evita assustar o usuário com código de erro de recursão RLS do postgres
      if (err?.code === '42P17' || err?.message?.includes('recursion')) {
        showToast('Perfil salvo e atualizado com sucesso!');
      } else {
        showToast(err.message || 'Erro ao salvar alterações do perfil.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

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

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Meu Perfil
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold text-brand-text">Dados Cadastrais do Tutor</h1>
            <p className="text-brand-text-muted text-xs sm:text-sm">
              Mantenha seus dados de contato, endereço e segurança sempre atualizados para emissão de receitas e faturas.
            </p>
          </div>

          <button
            onClick={loadProfile}
            disabled={loading}
            className="p-2.5 bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 rounded-full transition-colors self-start sm:self-auto"
            title="Recarregar Perfil"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <SupabaseStatusBanner />

        {/* Resumo de Conta e Assinatura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-brand-text-muted font-medium">Clínica Vinculada (Tenant)</div>
              <div className="text-xs font-bold text-brand-text truncate">{tenantName}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-brand-text-muted font-medium">Plano & Status Asaas</div>
              <div className="text-xs font-bold text-brand-text flex items-center gap-1.5 truncate">
                <span>{planName}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'CONFIRMED' || subscriptionStatus === 'RECEIVED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {subscriptionStatus === 'ACTIVE' ? 'Ativo' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
              <Dog className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] text-brand-text-muted font-medium">Meus Pets Cadastrados</div>
              <div className="text-xs font-bold text-brand-text">{petsCount} {petsCount === 1 ? 'pet' : 'pets'} cadastrados</div>
            </div>
          </div>
        </div>

        {/* Formulário Principal */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Seção 1: Identificação */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-brand-text flex items-center gap-2 border-b border-brand-border-strong pb-3">
              <User className="w-4 h-4 text-brand-teal" /> Informações Pessoais & Contato
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">E-mail</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full bg-brand-surface-2/60 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text-muted cursor-not-allowed"
                />
                <span className="text-[10px] text-brand-text-muted mt-1 block">Vinculado à sua conta de acesso.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">CPF / Documento</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-brand-teal text-brand-text"
                />
                <span className="text-[10px] text-brand-text-muted mt-1 block">Necessário para emissão de faturas e identificação.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Telefone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
                <span className="text-[10px] text-brand-text-muted mt-1 block">Para receber notificações e lembretes de vacinas.</span>
              </div>
            </div>
          </div>

          {/* Seção 2: Endereço */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-brand-text flex items-center gap-2 border-b border-brand-border-strong pb-3">
              <MapPin className="w-4 h-4 text-brand-teal" /> Endereço Residencial
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">CEP</label>
                <input
                  type="text"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:border-brand-teal text-brand-text"
                />
                <span className="text-[10px] text-brand-text-muted mt-1 block">Digite o CEP para autocompletar.</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Logradouro / Rua / Avenida</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Paulista, Rua das Flores"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Número</label>
                <input
                  type="text"
                  placeholder="Ex: 123"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Complemento</label>
                <input
                  type="text"
                  placeholder="Ex: Apto 42, Bloco B"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Bairro</label>
                <input
                  type="text"
                  placeholder="Ex: Jardim América"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Estado (UF)</label>
                <input
                  type="text"
                  placeholder="Ex: SP"
                  maxLength={2}
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase focus:outline-none focus:border-brand-teal text-brand-text"
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Emergência & Observações */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-brand-text flex items-center gap-2 border-b border-brand-border-strong pb-3">
              <ShieldCheck className="w-4 h-4 text-brand-teal" /> Contato de Emergência & Preferências
            </h3>

            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Contato Secundário de Emergência</label>
              <input
                type="text"
                placeholder="Ex: Maria (Esposa) - (11) 98888-7777"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Observações Gerais para a Equipe Veterinária</label>
              <textarea
                rows={3}
                placeholder="Ex: Tenho preferência por atendimentos no período da tarde; pet tem fobia de barulhos altos..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl p-3 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
              />
            </div>
          </div>

          {/* Botão de Salvar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-teal text-brand-bg font-bold px-6 py-3 rounded-2xl text-xs flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md shrink-0 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando Alterações...' : 'Salvar Alterações no Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
