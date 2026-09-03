'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Users, Stethoscope, Building, Plus, Search, Edit2, Trash2, 
  CheckCircle2, XCircle, MapPin, Phone, Mail, MessageCircle, 
  Sparkles, Star, Navigation, RefreshCw, X, ShieldCheck, AlertCircle,
  ExternalLink, Globe, Smartphone, HeartPulse, QrCode, CreditCard,
  Send, Copy, Check, Zap, AlertTriangle, ShieldAlert, Crown, Power
} from 'lucide-react';
import { 
  TutorRecord, VetRecord, getTutors, saveTutor, deleteTutor, 
  getVets, saveVet, deleteVet 
} from '@/lib/cadastroService';
import { 
  Partner, PARTNER_CATEGORIES, getPartners, savePartner, deletePartner 
} from '@/lib/partnerService';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';
import { SecurityDeleteModal } from '@/components/SecurityDeleteModal';
import { isModuleActive, toggleSystemModule, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';
import { getAsaasConfig } from '@/lib/asaas';

export default function CentralCadastrosPage() {
  const [activeTab, setActiveTab] = useState<'tutores' | 'veterinarios' | 'parceiros'>('tutores');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [userRole, setUserRole] = useState<'super_admin' | 'admin' | 'tutor'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('vetpro_user_role') as 'super_admin' | 'admin' | 'tutor' | null;
      if (stored) return stored;
    }
    return 'super_admin';
  });
  
  // Controle do Módulo de Parceiros
  const [isPartnersModuleEnabled, setIsPartnersModuleEnabled] = useState<boolean>(() => {
    return isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS);
  });
  const [togglingModule, setTogglingModule] = useState(false);

  // Modal de Cobrança / Sincronização Asaas do Tutor
  const [invoiceModalState, setInvoiceModalState] = useState<{
    isOpen: boolean;
    tutor: TutorRecord | null;
    loading: boolean;
    invoiceUrl?: string;
    pixQrCode?: string;
    pixCopiaECola?: string;
    bankSlipUrl?: string;
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    value?: number;
    planName?: string;
    whatsappUrl?: string;
    error?: string;
    copied: boolean;
  }>({
    isOpen: false,
    tutor: null,
    loading: false,
    copied: false,
  });

  // Estados de Exclusão Segura
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    itemType: 'Tutor' | 'Veterinário' | 'Parceiro';
    itemId: string;
    itemName: string;
    impactWarnings: string[];
    onConfirmDelete: () => Promise<void>;
  }>({
    isOpen: false,
    itemType: 'Tutor',
    itemId: '',
    itemName: '',
    impactWarnings: [],
    onConfirmDelete: async () => {},
  });

  // Estados dos Dados Reais
  const [tutores, setTutores] = useState<TutorRecord[]>([]);
  const [vets, setVets] = useState<VetRecord[]>([]);
  const [parceiros, setParceiros] = useState<Partner[]>([]);

  // Modais de Cadastro
  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [editingTutor, setEditingTutor] = useState<TutorRecord | null>(null);
  const [tutorForm, setTutorForm] = useState({ name: '', email: '', phone: '', cpf: '', plan_name: 'Essencial', status: 'active' as 'active' | 'inactive' });

  const [isVetModalOpen, setIsVetModalOpen] = useState(false);
  const [editingVet, setEditingVet] = useState<VetRecord | null>(null);
  const [vetForm, setVetForm] = useState({ name: '', email: '', phone: '', crmv: '', crmv_uf: 'SP', specialty: 'Clínica Geral', clinic_name: '', role: 'veterinario' as 'veterinario' | 'admin', status: 'active' as 'active' | 'inactive' });

  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    category: 'clinica' as Partner['category'],
    description: '',
    logo_url: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: '',
    neighborhood: '',
    city: '',
    state: 'SP',
    latitude: '',
    longitude: '',
    is_featured: true,
    banner_badge: 'Parceiro Credenciado',
    promo_text: '',
    status: 'active' as 'active' | 'inactive'
  });

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [tutoresData, vetsData, parceirosData] = await Promise.all([
        getTutors(),
        getVets(),
        getPartners()
      ]);
      setTutores(tutoresData);
      setVets(vetsData);
      setParceiros(parceirosData);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [tutoresData, vetsData, parceirosData] = await Promise.all([
          getTutors(),
          getVets(),
          getPartners()
        ]);
        if (active) {
          setTutores(tutoresData);
          setVets(vetsData);
          setParceiros(parceirosData);
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // --- HANDLERS TUTOR ---
  const handleOpenTutorModal = (tutor?: TutorRecord) => {
    if (tutor) {
      setEditingTutor(tutor);
      setTutorForm({
        name: tutor.name,
        email: tutor.email,
        phone: tutor.phone || '',
        cpf: tutor.cpf || '',
        plan_name: tutor.plan_name || 'Essencial',
        status: tutor.status
      });
    } else {
      setEditingTutor(null);
      setTutorForm({ name: '', email: '', phone: '', cpf: '', plan_name: 'Essencial', status: 'active' });
    }
    setIsTutorModalOpen(true);
  };

  const handleGenerateAsaasForTutor = async (tutor: TutorRecord) => {
    setInvoiceModalState({
      isOpen: true,
      tutor,
      loading: true,
      copied: false,
    });

    try {
      const localAsaasConfig = getAsaasConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') || '' : '';

      const planId = (tutor.plan_name || '').toLowerCase().includes('especialista') ? 'especialista' : 'essencial';
      const planPrice = planId === 'especialista' ? 29.90 : 9.90;

      const res = await fetch('/api/asaas/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: tutor.id,
          customerId: tutor.asaas_customer_id || undefined,
          email: tutor.email,
          name: tutor.name,
          cpfCnpj: tutor.cpf || undefined,
          phone: tutor.phone || undefined,
          planId,
          planName: tutor.plan_name || (planId === 'especialista' ? 'Especialista' : 'Essencial'),
          planPrice,
          forceNewCharge: true,
          asaasConfig: {
            apiKey: localAsaasConfig.apiKey,
            environment: localAsaasConfig.environment,
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
        setInvoiceModalState({
          isOpen: true,
          tutor,
          loading: false,
          invoiceUrl: data.invoiceUrl || data.paymentUrl,
          pixQrCode: data.pixQrCodeImage,
          pixCopiaECola: data.pixCopiaECola,
          bankSlipUrl: data.bankSlipUrl,
          customerId: data.customerId,
          subscriptionId: data.subscriptionId,
          status: data.status || 'PENDING',
          value: data.value || planPrice,
          planName: data.planName || tutor.plan_name,
          whatsappUrl: data.whatsappUrl,
          copied: false,
        });

        // Atualiza tutor localmente e recarrega
        showToast('Cobrança gerada no Asaas com sucesso!');
        loadAllData();
      } else {
        setInvoiceModalState(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Erro ao sincronizar com o Asaas.',
        }));
        showToast(data.error || 'Erro ao sincronizar com o Asaas.', 'error');
      }
    } catch (err: any) {
      setInvoiceModalState(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Erro de conexão.',
      }));
      showToast('Erro de conexão ao gerar fatura.', 'error');
    }
  };

  const handleApproveSandboxInInvoiceModal = async () => {
    if (!invoiceModalState.tutor) return;
    setInvoiceModalState(prev => ({ ...prev, loading: true }));

    try {
      const localAsaasConfig = getAsaasConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') || '' : '';

      const res = await fetch('/api/asaas/sandbox-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: invoiceModalState.tutor.id,
          email: invoiceModalState.tutor.email,
          customerId: invoiceModalState.customerId || invoiceModalState.tutor.asaas_customer_id,
          subscriptionId: invoiceModalState.subscriptionId,
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
        showToast('Pagamento de teste APROVADO no Sandbox! Assinatura Ativa.');
        setInvoiceModalState(prev => ({
          ...prev,
          loading: false,
          status: 'ACTIVE',
        }));
        loadAllData();
      } else {
        showToast(data.error || 'Não foi possível aprovar no Sandbox.', 'error');
        setInvoiceModalState(prev => ({ ...prev, loading: false }));
      }
    } catch (err: any) {
      showToast('Erro ao conectar ao Sandbox.', 'error');
      setInvoiceModalState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSaveTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutorForm.name || !tutorForm.email) {
      showToast('Nome e e-mail são obrigatórios.', 'error');
      return;
    }

    const res = await saveTutor({
      id: editingTutor?.id,
      ...tutorForm
    });

    if (res.success && res.data) {
      showToast(editingTutor ? 'Tutor atualizado com sucesso!' : 'Tutor cadastrado com sucesso!');
      setIsTutorModalOpen(false);
      loadAllData();

      // Se for novo tutor ou não tiver asaas_customer_id, já oferece sincronizar
      if (!editingTutor && res.data.email) {
        handleGenerateAsaasForTutor(res.data);
      }
    } else {
      showToast(res.error || 'Erro ao salvar tutor.', 'error');
    }
  };

  const handleToggleModule = async () => {
    if (userRole !== 'super_admin') return;
    setTogglingModule(true);
    const newStatus = !isPartnersModuleEnabled;
    await toggleSystemModule(SYSTEM_MODULE_KEYS.PARCEIROS_GPS, newStatus);
    setIsPartnersModuleEnabled(newStatus);
    showToast(newStatus ? 'Módulo de Parceiros ativado no sistema!' : 'Módulo de Parceiros pausado.');
    setTogglingModule(false);
  };

  const handleDeleteTutor = (tutor: TutorRecord) => {
    setDeleteModalState({
      isOpen: true,
      itemType: 'Tutor',
      itemId: tutor.id,
      itemName: tutor.name,
      impactWarnings: [
        'Os pets vinculados a este tutor não serão mais listados para este e-mail.',
        'O histórico de vacinas e prontuários vinculados será desassociado.',
        'Esta exclusão será registrada no log de auditoria.'
      ],
      onConfirmDelete: async () => {
        const res = await deleteTutor(tutor.id, tutor.name);
        if (res.success) {
          showToast(`Tutor "${tutor.name}" excluído com sucesso.`);
          loadAllData();
        } else {
          showToast(res.error || 'Erro ao excluir tutor.', 'error');
        }
      }
    });
  };

  // --- HANDLERS VET ---
  const handleOpenVetModal = (vet?: VetRecord) => {
    if (vet) {
      setEditingVet(vet);
      setVetForm({
        name: vet.name,
        email: vet.email,
        phone: vet.phone || '',
        crmv: vet.crmv,
        crmv_uf: vet.crmv_uf,
        specialty: vet.specialty || 'Clínica Geral',
        clinic_name: vet.clinic_name || '',
        role: (vet.role === 'admin' ? 'admin' : 'veterinario'),
        status: vet.status
      });
    } else {
      setEditingVet(null);
      setVetForm({ name: '', email: '', phone: '', crmv: '', crmv_uf: 'SP', specialty: 'Clínica Geral', clinic_name: '', role: 'veterinario', status: 'active' });
    }
    setIsVetModalOpen(true);
  };

  const handleSaveVet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vetForm.name || !vetForm.email || !vetForm.crmv) {
      showToast('Nome, e-mail e CRMV são obrigatórios.', 'error');
      return;
    }

    const res = await saveVet({
      id: editingVet?.id,
      ...vetForm
    });

    if (res.success) {
      showToast(editingVet ? 'Veterinário atualizado com sucesso!' : 'Veterinário cadastrado com sucesso!');
      setIsVetModalOpen(false);
      loadAllData();
    } else {
      showToast(res.error || 'Erro ao salvar veterinário.', 'error');
    }
  };

  const handleDeleteVet = (vet: VetRecord) => {
    setDeleteModalState({
      isOpen: true,
      itemType: 'Veterinário',
      itemId: vet.id,
      itemName: vet.name,
      impactWarnings: [
        'O acesso clínico e permissões de prescrição deste profissional serão revogados.',
        'Receitas digitais emitidas anteriormente permanecerão no histórico com o CRMV registrado.',
        'Esta exclusão será registrada no log de auditoria.'
      ],
      onConfirmDelete: async () => {
        const res = await deleteVet(vet.id, vet.name);
        if (res.success) {
          showToast(`Veterinário "${vet.name}" excluído.`);
          loadAllData();
        } else {
          showToast(res.error || 'Erro ao excluir veterinário.', 'error');
        }
      }
    });
  };

  // --- HANDLERS PARCEIRO (EXCLUSIVO SUPER ADMIN) ---
  const handleOpenPartnerModal = (partner?: Partner) => {
    if (userRole !== 'super_admin') {
      showToast('Apenas o Super Administrador pode cadastrar ou alterar parceiros.', 'error');
      return;
    }

    if (partner) {
      setEditingPartner(partner);
      setPartnerForm({
        name: partner.name,
        category: partner.category,
        description: partner.description || '',
        logo_url: partner.logo_url || '',
        phone: partner.phone || '',
        whatsapp: partner.whatsapp || '',
        email: partner.email || '',
        website: partner.website || '',
        address: partner.address,
        neighborhood: partner.neighborhood || '',
        city: partner.city,
        state: partner.state,
        latitude: partner.latitude ? String(partner.latitude) : '',
        longitude: partner.longitude ? String(partner.longitude) : '',
        is_featured: partner.is_featured,
        banner_badge: partner.banner_badge || 'Parceiro Credenciado',
        promo_text: partner.promo_text || '',
        status: partner.status
      });
    } else {
      setEditingPartner(null);
      setPartnerForm({
        name: '',
        category: 'clinica',
        description: '',
        logo_url: '',
        phone: '',
        whatsapp: '',
        email: '',
        website: '',
        address: '',
        neighborhood: '',
        city: '',
        state: 'SP',
        latitude: '',
        longitude: '',
        is_featured: true,
        banner_badge: 'Parceiro Credenciado',
        promo_text: '',
        status: 'active'
      });
    }
    setIsPartnerModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'super_admin') {
      showToast('Permissão negada: somente o Super Administrador pode salvar parceiros.', 'error');
      return;
    }

    if (!partnerForm.name || !partnerForm.address || !partnerForm.city) {
      showToast('Nome, endereço e cidade são obrigatórios.', 'error');
      return;
    }

    const res = await savePartner({
      id: editingPartner?.id,
      name: partnerForm.name,
      category: partnerForm.category,
      description: partnerForm.description,
      logo_url: partnerForm.logo_url,
      phone: partnerForm.phone,
      whatsapp: partnerForm.whatsapp,
      email: partnerForm.email,
      website: partnerForm.website,
      address: partnerForm.address,
      neighborhood: partnerForm.neighborhood,
      city: partnerForm.city,
      state: partnerForm.state,
      latitude: partnerForm.latitude ? parseFloat(partnerForm.latitude) : undefined,
      longitude: partnerForm.longitude ? parseFloat(partnerForm.longitude) : undefined,
      is_featured: partnerForm.is_featured,
      banner_badge: partnerForm.banner_badge,
      promo_text: partnerForm.promo_text,
      status: partnerForm.status
    });

    if (res.success) {
      showToast(editingPartner ? 'Parceiro atualizado com sucesso!' : 'Parceiro cadastrado com sucesso!');
      setIsPartnerModalOpen(false);
      loadAllData();
    } else {
      showToast(res.error || 'Erro ao salvar parceiro.', 'error');
    }
  };

  const handleDeletePartner = (partner: Partner) => {
    if (userRole !== 'super_admin') {
      showToast('Apenas o Super Administrador pode remover parceiros.', 'error');
      return;
    }

    setDeleteModalState({
      isOpen: true,
      itemType: 'Parceiro',
      itemId: partner.id,
      itemName: partner.name,
      impactWarnings: [
        'O estabelecimento será removido do guia de parceiros e da busca por proximidade GPS.',
        'Se este parceiro possuir anúncios rotativos em destaque, eles serão desativados.',
        'Esta exclusão será registrada no log de auditoria.'
      ],
      onConfirmDelete: async () => {
        const res = await deletePartner(partner.id, partner.name);
        if (res.success) {
          showToast(`Parceiro "${partner.name}" removido com sucesso.`);
          loadAllData();
        } else {
          showToast(res.error || 'Erro ao excluir parceiro.', 'error');
        }
      }
    });
  };

  // Preenchimento de GPS atual no formulário de parceiro
  const handleDetectGPSForPartner = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPartnerForm(prev => ({
            ...prev,
            latitude: pos.coords.latitude.toFixed(6),
            longitude: pos.coords.longitude.toFixed(6)
          }));
          showToast('Coordenadas GPS preenchidas!');
        },
        () => showToast('Não foi possível obter coordenadas GPS.', 'error')
      );
    }
  };

  // Filtragem
  const filteredTutores = useMemo(() => {
    return tutores.filter(t => 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.phone && t.phone.includes(searchTerm))
    );
  }, [tutores, searchTerm]);

  const filteredVets = useMemo(() => {
    return vets.filter(v => 
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.crmv.includes(searchTerm) ||
      (v.specialty && v.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vets, searchTerm]);

  const filteredParceiros = useMemo(() => {
    return parceiros.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.neighborhood && p.neighborhood.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.promo_text && p.promo_text.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [parceiros, searchTerm]);

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Toast Notificação */}
        {toastMessage && (
          <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success' ? 'bg-brand-surface border-emerald-500 text-emerald-400' : 'bg-brand-surface border-rose-500 text-rose-400'
          }`}>
            {toastMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Central de Cadastros Unificada
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-brand-text">
              Gerenciamento de Usuários e Parceiros
            </h1>
            <p className="text-brand-text-muted text-xs sm:text-sm mt-1">
              Controle centralizado de tutores, médicos-veterinários com CRMV e parceiros credenciados com anúncios rotativos.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={loadAllData}
              className="p-2.5 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text-muted hover:text-brand-text transition-colors"
              title="Recarregar cadastros"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {activeTab === 'tutores' && (
              <button
                onClick={() => handleOpenTutorModal()}
                className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Novo Tutor
              </button>
            )}

            {activeTab === 'veterinarios' && (
              <button
                onClick={() => handleOpenVetModal()}
                className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Novo Veterinário
              </button>
            )}

            {activeTab === 'parceiros' && userRole === 'super_admin' && (
              <button
                onClick={() => handleOpenPartnerModal()}
                className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Novo Parceiro / Anúncio
              </button>
            )}
          </div>
        </div>

        {/* Banner Supabase */}
        <SupabaseStatusBanner />

        {/* Cards de Métricas Reais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Tutores Cadastrados</span>
              <Users className="w-4 h-4 text-brand-teal" />
            </div>
            <div className="text-2xl font-bold text-brand-text">{tutores.length}</div>
            <p className="text-[11px] text-brand-text-muted mt-1">Registros ativos na base</p>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Médicos Veterinários</span>
              <Stethoscope className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-brand-text">{vets.length}</div>
            <p className="text-[11px] text-blue-400 mt-1">Profissionais habilitados com CRMV</p>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Parceiros Credenciados</span>
              <Building className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-brand-text">{parceiros.length}</div>
            <p className="text-[11px] text-emerald-400 mt-1">
              {parceiros.filter(p => p.is_featured).length} com anúncios rotativos ativos
            </p>
          </div>
        </div>

        {/* Navegação por Abas */}
        <div className="flex items-center gap-2 border-b border-brand-border-strong pb-3 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('tutores'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'tutores'
                ? 'bg-brand-teal text-brand-bg shadow-sm'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tutores ({tutores.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('veterinarios'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'veterinarios'
                ? 'bg-brand-teal text-brand-bg shadow-sm'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Veterinários ({vets.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('parceiros'); setSearchTerm(''); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'parceiros'
                ? 'bg-brand-teal text-brand-bg shadow-sm'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Parceiros & Anúncios Rotativos ({parceiros.length})</span>
          </button>
        </div>

        {/* Barra de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-brand-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Buscar em ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border-strong rounded-xl text-xs sm:text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-teal transition-colors"
          />
        </div>

        {/* TAB 1: TUTORES */}
        {activeTab === 'tutores' && (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden shadow-sm">
            {filteredTutores.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 text-brand-teal flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-brand-text">Nenhum tutor cadastrado</h3>
                <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                  {searchTerm ? 'Nenhum resultado para a busca.' : 'Cadastre os tutores para acompanhar assinaturas e pets vinculados.'}
                </p>
                <button
                  onClick={() => handleOpenTutorModal()}
                  className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar Primeiro Tutor
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-surface-2 border-b border-brand-border-strong text-brand-text-muted font-semibold">
                    <tr>
                      <th className="p-4">Nome & Contato</th>
                      <th className="p-4">CPF</th>
                      <th className="p-4">Plano</th>
                      <th className="p-4">Status & Asaas</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border-strong">
                    {filteredTutores.map((tutor) => {
                      const isAsaasActive = tutor.subscription_status === 'ACTIVE' || tutor.subscription_status === 'CONFIRMED' || tutor.subscription_status === 'RECEIVED';
                      const hasAsaasId = !!tutor.asaas_customer_id;

                      return (
                        <tr key={tutor.id} className="hover:bg-brand-surface-2/40 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-brand-text text-sm">{tutor.name}</div>
                            <div className="text-[11px] text-brand-text-muted flex items-center gap-2 mt-0.5">
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-brand-teal" /> {tutor.email}</span>
                              {tutor.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-brand-teal" /> {tutor.phone}</span>}
                            </div>
                            {hasAsaasId && (
                              <div className="text-[10px] font-mono text-brand-teal/80 mt-1">
                                Asaas ID: {tutor.asaas_customer_id}
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-brand-text-muted font-mono">{tutor.cpf || '—'}</td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20">
                              {tutor.plan_name || 'Essencial'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                isAsaasActive
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                  : hasAsaasId
                                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                              }`}>
                                {isAsaasActive ? '🟢 Assinatura Paga/Ativa' : hasAsaasId ? '🟡 Fatura Pendente' : '🔴 Não Sincronizado no Asaas'}
                              </span>
                              <span className="text-[10px] text-brand-text-muted">
                                Status da Conta: {tutor.status === 'active' ? 'Ativo no App' : 'Inativo'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleGenerateAsaasForTutor(tutor)}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all ${
                                  isAsaasActive
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                    : 'bg-brand-teal/15 border-brand-teal/30 text-brand-teal hover:bg-brand-teal hover:text-brand-bg shadow-sm'
                                }`}
                                title="Sincronizar no Asaas e gerar cobrança (Pix / Boleto / Cartão)"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>{hasAsaasId ? 'Cobrança Asaas' : 'Sincronizar Asaas'}</span>
                              </button>
                              <button
                                onClick={() => handleOpenTutorModal(tutor)}
                                className="p-1.5 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-brand-teal hover:border-brand-teal transition-colors"
                                title="Editar tutor"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTutor(tutor)}
                                className="p-1.5 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-rose-400 hover:border-rose-400 transition-colors"
                                title="Excluir tutor com segurança"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VETERINÁRIOS */}
        {activeTab === 'veterinarios' && (
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden shadow-sm">
            {filteredVets.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-brand-text">Nenhum veterinário cadastrado</h3>
                <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                  {searchTerm ? 'Nenhum resultado para a busca.' : 'Cadastre os médicos-veterinários da equipe com seus respectivos números de CRMV e especialidades.'}
                </p>
                <button
                  onClick={() => handleOpenVetModal()}
                  className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Veterinário
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-surface-2 border-b border-brand-border-strong text-brand-text-muted font-semibold">
                    <tr>
                      <th className="p-4">Profissional & Contato</th>
                      <th className="p-4">CRMV / Registro</th>
                      <th className="p-4">Especialidade</th>
                      <th className="p-4">Função</th>
                      <th className="p-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border-strong">
                    {filteredVets.map((vet) => (
                      <tr key={vet.id} className="hover:bg-brand-surface-2/40 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-brand-text text-sm flex items-center gap-1.5">
                            <span>{vet.name}</span>
                            {vet.crmv_validated && (
                              <span title="CRMV Verificado" className="inline-flex">
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-brand-text-muted flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-brand-teal" /> {vet.email}</span>
                            {vet.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-brand-teal" /> {vet.phone}</span>}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                            CRMV-{vet.crmv_uf} {vet.crmv}
                          </span>
                        </td>
                        <td className="p-4 text-brand-text font-medium">{vet.specialty || 'Clínica Geral'}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-surface-2 border border-brand-border-strong text-brand-text">
                            {vet.role === 'admin' ? 'Administrador' : 'Veterinário'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenVetModal(vet)}
                              className="p-1.5 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-brand-teal hover:border-brand-teal transition-colors"
                              title="Editar veterinário"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVet(vet)}
                              className="p-1.5 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-rose-400 hover:border-rose-400 transition-colors"
                              title="Excluir veterinário com segurança"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PARCEIROS & ANÚNCIOS ROTATIVOS */}
        {activeTab === 'parceiros' && (
          <div className="space-y-4">
            {/* Super Admin Quick Module Toggle */}
            {userRole === 'super_admin' ? (
              <div className="bg-brand-surface border border-brand-teal/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0 border border-brand-teal/20">
                    <Crown className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-brand-text">Módulo de Rede de Parceiros & GPS</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPartnersModuleEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {isPartnersModuleEnabled ? '🟢 Ativado' : '🔴 Desativado / Pausado'}
                      </span>
                    </div>
                    <p className="text-xs text-brand-text-muted">
                      {isPartnersModuleEnabled 
                        ? 'O módulo está ativo para tutores visualizarem estabelecimentos, mapas e anúncios.' 
                        : 'O módulo está pausado para tutores. Apenas a administração pode gerenciar.'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleToggleModule}
                  disabled={togglingModule}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-sm cursor-pointer ${
                    isPartnersModuleEnabled 
                      ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25' 
                      : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{togglingModule ? 'Alterando...' : isPartnersModuleEnabled ? 'Pausar Módulo Parceiros' : 'Ativar Módulo Parceiros'}</span>
                </button>
              </div>
            ) : (
              <div className="bg-brand-surface-2/80 border border-brand-teal/20 rounded-2xl p-4 flex items-center gap-3 text-xs text-brand-text-muted">
                <ShieldCheck className="w-5 h-5 text-brand-teal flex-shrink-0" />
                <span>
                  <strong className="text-brand-text">Modo de Consulta:</strong> O credenciamento e homologação de novos parceiros e anúncios rotativos é gerenciado exclusivamente pelo Super Administrador da plataforma.
                </span>
              </div>
            )}

            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden shadow-sm">
              {filteredParceiros.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <Building className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-brand-text">Nenhum parceiro credenciado</h3>
                  <p className="text-xs text-brand-text-muted max-w-md mx-auto">
                    {searchTerm ? 'Nenhum resultado para a busca.' : 'Cadastre clínicas, hospitais 24h e lojas parceiras para ativar o sistema de geolocalização e anúncios rotativos.'}
                  </p>
                  {userRole === 'super_admin' && (
                    <button
                      onClick={() => handleOpenPartnerModal()}
                      className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Cadastrar Primeiro Parceiro
                    </button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-surface-2 border-b border-brand-border-strong text-brand-text-muted font-semibold">
                      <tr>
                        <th className="p-4">Estabelecimento</th>
                        <th className="p-4">Categoria</th>
                        <th className="p-4">Localização & GPS</th>
                        <th className="p-4">Anúncio Rotativo</th>
                        <th className="p-4">WhatsApp / Fone</th>
                        {userRole === 'super_admin' && <th className="p-4 text-right">Ações</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border-strong">
                      {filteredParceiros.map((partner) => (
                        <tr key={partner.id} className="hover:bg-brand-surface-2/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-brand-surface-2 border border-brand-border-strong overflow-hidden flex items-center justify-center flex-shrink-0">
                                {partner.logo_url ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img src={partner.logo_url} alt={partner.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Building className="w-5 h-5 text-brand-teal" />
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-brand-text text-sm">{partner.name}</div>
                                {partner.promo_text && (
                                  <div className="text-[11px] text-brand-teal font-medium line-clamp-1">{partner.promo_text}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-teal/15 text-brand-teal border border-brand-teal/20">
                              {PARTNER_CATEGORIES.find(c => c.id === partner.category)?.label || partner.category}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="text-brand-text font-medium">{partner.city}/{partner.state}</div>
                            <div className="text-[11px] text-brand-text-muted line-clamp-1">{partner.address}</div>
                            {partner.latitude && partner.longitude && (
                              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                <Navigation className="w-2.5 h-2.5" /> GPS Configurado
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                              partner.is_featured
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                                : 'bg-brand-surface-2 text-brand-text-muted border border-brand-border-strong'
                            }`}>
                              <Sparkles className="w-3 h-3" />
                              {partner.is_featured ? 'Destaque Ativo' : 'Padrão'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-0.5 text-[11px]">
                              {partner.whatsapp && (
                                <a 
                                  href={`https://wa.me/55${partner.whatsapp.replace(/\D/g, '')}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                                >
                                  <MessageCircle className="w-3 h-3" /> {partner.whatsapp}
                                </a>
                              )}
                              {partner.phone && <div className="text-brand-text-muted">{partner.phone}</div>}
                            </div>
                          </td>
                          {userRole === 'super_admin' && (
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenPartnerModal(partner)}
                                  className="p-1.5 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-brand-teal hover:border-brand-teal transition-colors"
                                  title="Editar parceiro (Super Admin)"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePartner(partner)}
                                  className="p-1.5 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-rose-400 hover:border-rose-400 transition-colors"
                                  title="Excluir parceiro com segurança (Super Admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL DE EXCLUSÃO SEGURA COM AUDITORIA */}
        <SecurityDeleteModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
          onConfirm={deleteModalState.onConfirmDelete}
          itemName={deleteModalState.itemName}
          itemType={deleteModalState.itemType}
          impactWarnings={deleteModalState.impactWarnings}
        />

        {/* MODAL DE COBRANÇA E SINCRONIZAÇÃO ASAAS */}
        {invoiceModalState.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border-strong mb-5">
                <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                  <Zap className="w-5 h-5 text-brand-teal" />
                  Sincronização & Cobrança Asaas
                </h3>
                <button
                  onClick={() => setInvoiceModalState(prev => ({ ...prev, isOpen: false }))}
                  className="text-brand-text-muted hover:text-brand-text p-1 rounded-lg hover:bg-brand-surface-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {invoiceModalState.loading ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full border-2 border-brand-teal border-t-transparent animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-brand-text">Comunicando com o Asaas...</h4>
                    <p className="text-xs text-brand-text-muted">
                      Verificando cliente, gerando assinatura e criando faturas de Pix e Cartão.
                    </p>
                  </div>
                </div>
              ) : invoiceModalState.error ? (
                <div className="py-6 space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold mb-0.5">Falha na Sincronização:</strong>
                      <span>{invoiceModalState.error}</span>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setInvoiceModalState(prev => ({ ...prev, isOpen: false }))}
                      className="px-4 py-2 rounded-xl bg-brand-surface-2 text-brand-text text-xs font-semibold hover:bg-brand-surface"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">Tutor:</span>
                      <strong className="text-brand-text font-semibold">{invoiceModalState.tutor?.name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">E-mail:</span>
                      <span className="text-brand-text font-mono text-[11px]">{invoiceModalState.tutor?.email}</span>
                    </div>
                    {invoiceModalState.customerId && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-brand-text-muted">Asaas Customer ID:</span>
                        <span className="text-brand-teal font-mono text-[11px] font-bold">{invoiceModalState.customerId}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">Plano & Valor:</span>
                      <span className="px-2 py-0.5 rounded-md bg-brand-teal/15 text-brand-teal text-[11px] font-bold">
                        {invoiceModalState.planName || 'Essencial'} — R$ {invoiceModalState.value?.toFixed(2).replace('.', ',')}/mês
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-brand-text-muted">Status da Cobrança:</span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        invoiceModalState.status === 'ACTIVE' || invoiceModalState.status === 'CONFIRMED' || invoiceModalState.status === 'RECEIVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {invoiceModalState.status === 'ACTIVE' || invoiceModalState.status === 'RECEIVED' ? 'Pago / Ativo' : 'Aguardando Pagamento'}
                      </span>
                    </div>
                  </div>

                  {/* PIX QR CODE & COPIA E COLA */}
                  {invoiceModalState.pixCopiaECola && (
                    <div className="p-4 rounded-2xl bg-brand-surface-2/60 border border-brand-teal/20 space-y-3 text-center">
                      <div className="flex items-center justify-center gap-2 text-xs font-bold text-brand-text">
                        <QrCode className="w-4 h-4 text-brand-teal" />
                        Pix Instantâneo (Liberação Imediata)
                      </div>
                      
                      {invoiceModalState.pixQrCode && (
                        <div className="inline-block p-2 bg-white rounded-2xl shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={invoiceModalState.pixQrCode.startsWith('data:') ? invoiceModalState.pixQrCode : `data:image/png;base64,${invoiceModalState.pixQrCode}`}
                            alt="QR Code Pix"
                            className="w-40 h-40 object-contain mx-auto"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={invoiceModalState.pixCopiaECola}
                          className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-[11px] font-mono text-brand-text-muted truncate"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (invoiceModalState.pixCopiaECola) {
                              navigator.clipboard.writeText(invoiceModalState.pixCopiaECola);
                              setInvoiceModalState(prev => ({ ...prev, copied: true }));
                              setTimeout(() => setInvoiceModalState(prev => ({ ...prev, copied: false })), 2500);
                              showToast('Chave Pix Copia e Cola copiada!');
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors flex items-center gap-1 shrink-0"
                        >
                          {invoiceModalState.copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{invoiceModalState.copied ? 'Copiado!' : 'Copiar Pix'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AÇÕES DE ENVIO / FATURA */}
                  <div className="space-y-2 pt-1">
                    {invoiceModalState.status !== 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={handleApproveSandboxInInvoiceModal}
                        disabled={invoiceModalState.loading}
                        className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Zap className="w-4 h-4" />
                        {invoiceModalState.loading ? 'Aprovando no Sandbox...' : '⚡ Aprovar no Sandbox (Simular Pagamento)'}
                      </button>
                    )}

                    {invoiceModalState.invoiceUrl && (
                      <a
                        href={invoiceModalState.invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                      >
                        <CreditCard className="w-4 h-4" />
                        Abrir Link de Pagamento / Fatura Asaas
                        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                      </a>
                    )}

                    {invoiceModalState.whatsappUrl && (
                      <a
                        href={invoiceModalState.whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 transition-all flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Enviar Link e Pix por WhatsApp ao Tutor
                      </a>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-brand-border-strong">
                    <button
                      onClick={() => setInvoiceModalState(prev => ({ ...prev, isOpen: false }))}
                      className="px-4 py-2 rounded-xl bg-brand-surface-2 text-brand-text text-xs font-semibold hover:bg-brand-surface"
                    >
                      Concluir
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL TUTOR */}
        {isTutorModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border-strong mb-5">
                <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                  <Users className="w-5 h-5 text-brand-teal" />
                  {editingTutor ? 'Editar Tutor' : 'Novo Cadastro de Tutor'}
                </h3>
                <button onClick={() => setIsTutorModalOpen(false)} className="text-brand-text-muted hover:text-brand-text">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTutor} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={tutorForm.name}
                    onChange={e => setTutorForm({ ...tutorForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                    placeholder="Ex: João da Silva"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">E-mail *</label>
                    <input
                      type="email"
                      required
                      value={tutorForm.email}
                      onChange={e => setTutorForm({ ...tutorForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={tutorForm.phone}
                      onChange={e => setTutorForm({ ...tutorForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="(11) 98888-7777"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">CPF</label>
                    <input
                      type="text"
                      value={tutorForm.cpf}
                      onChange={e => setTutorForm({ ...tutorForm, cpf: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Plano Ativo</label>
                    <select
                      value={tutorForm.plan_name}
                      onChange={e => setTutorForm({ ...tutorForm, plan_name: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                    >
                      <option value="Essencial">Essencial (R$ 9,90/mês)</option>
                      <option value="Especialista">Especialista (R$ 29,90/mês)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-brand-border-strong">
                  <button
                    type="button"
                    onClick={() => setIsTutorModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-brand-surface-2 text-brand-text text-xs font-semibold hover:bg-brand-surface transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm"
                  >
                    Salvar Tutor
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL VETERINÁRIO */}
        {isVetModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border-strong mb-5">
                <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-400" />
                  {editingVet ? 'Editar Veterinário' : 'Novo Cadastro de Veterinário'}
                </h3>
                <button onClick={() => setIsVetModalOpen(false)} className="text-brand-text-muted hover:text-brand-text">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveVet} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Nome Completo com Título *</label>
                  <input
                    type="text"
                    required
                    value={vetForm.name}
                    onChange={e => setVetForm({ ...vetForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                    placeholder="Ex: Dr. Roberto Mendes"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">E-mail de Acesso *</label>
                    <input
                      type="email"
                      required
                      value={vetForm.email}
                      onChange={e => setVetForm({ ...vetForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="vet@clinica.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={vetForm.phone}
                      onChange={e => setVetForm({ ...vetForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-brand-text mb-1">Número do CRMV *</label>
                    <input
                      type="text"
                      required
                      value={vetForm.crmv}
                      onChange={e => setVetForm({ ...vetForm, crmv: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      placeholder="18204"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">UF CRMV</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={vetForm.crmv_uf}
                      onChange={e => setVetForm({ ...vetForm, crmv_uf: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal uppercase font-mono"
                      placeholder="SP"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Especialidade Principal</label>
                    <input
                      type="text"
                      value={vetForm.specialty}
                      onChange={e => setVetForm({ ...vetForm, specialty: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="Ex: Dermatologia & Clínica Geral"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Permissão no Sistema</label>
                    <select
                      value={vetForm.role}
                      onChange={e => setVetForm({ ...vetForm, role: e.target.value as any })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                    >
                      <option value="veterinario">Veterinário Clínico</option>
                      <option value="admin">Administrador da Clínica</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-brand-border-strong">
                  <button
                    type="button"
                    onClick={() => setIsVetModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-brand-surface-2 text-brand-text text-xs font-semibold hover:bg-brand-surface transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm"
                  >
                    Salvar Veterinário
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL PARCEIRO / ANÚNCIO ROTATIVO */}
        {isPartnerModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-150 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-brand-border-strong mb-5">
                <div>
                  <h3 className="font-bold text-lg text-brand-text flex items-center gap-2">
                    <Building className="w-5 h-5 text-emerald-400" />
                    {editingPartner ? 'Editar Parceiro & Anúncio' : 'Novo Parceiro Credenciado'}
                  </h3>
                  <p className="text-xs text-brand-text-muted mt-0.5">
                    Configure as informações que aparecerão nos cards rotativos e na busca por geolocalização.
                  </p>
                </div>
                <button onClick={() => setIsPartnerModalOpen(false)} className="text-brand-text-muted hover:text-brand-text">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePartner} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Nome do Estabelecimento *</label>
                    <input
                      type="text"
                      required
                      value={partnerForm.name}
                      onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="Ex: Hospital Veterinário São Paulo 24h"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Categoria de Serviço *</label>
                    <select
                      value={partnerForm.category}
                      onChange={e => setPartnerForm({ ...partnerForm, category: e.target.value as any })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                    >
                      {PARTNER_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">URL do Logotipo / Imagem</label>
                    <input
                      type="url"
                      value={partnerForm.logo_url}
                      onChange={e => setPartnerForm({ ...partnerForm, logo_url: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="https://exemplo.com/logo.png"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Selo / Badge de Destaque</label>
                    <input
                      type="text"
                      value={partnerForm.banner_badge}
                      onChange={e => setPartnerForm({ ...partnerForm, banner_badge: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="Ex: Desconto Exclusivo ou Plantão 24h"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1">Oferta / Benefício Promocional</label>
                  <input
                    type="text"
                    value={partnerForm.promo_text}
                    onChange={e => setPartnerForm({ ...partnerForm, promo_text: e.target.value })}
                    className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                    placeholder="Ex: 10% de desconto na primeira consulta presencial para clientes VetPro"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">WhatsApp de Atendimento</label>
                    <input
                      type="text"
                      value={partnerForm.whatsapp}
                      onChange={e => setPartnerForm({ ...partnerForm, whatsapp: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="(11) 99999-8888"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Telefone Fixo</label>
                    <input
                      type="text"
                      value={partnerForm.phone}
                      onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="(11) 3333-2222"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Website / Instagram</label>
                    <input
                      type="text"
                      value={partnerForm.website}
                      onChange={e => setPartnerForm({ ...partnerForm, website: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="instagram.com/clinica"
                    />
                  </div>
                </div>

                {/* Localização e GPS */}
                <div className="p-4 bg-brand-surface-2 rounded-2xl border border-brand-border-strong space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand-teal" /> Endereço & Geolocalização
                    </span>
                    <button
                      type="button"
                      onClick={handleDetectGPSForPartner}
                      className="text-[11px] font-bold text-brand-teal hover:underline flex items-center gap-1"
                    >
                      <Navigation className="w-3 h-3" /> Preencher com Meu GPS Atual
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-text mb-1">Endereço (Rua, Número) *</label>
                    <input
                      type="text"
                      required
                      value={partnerForm.address}
                      onChange={e => setPartnerForm({ ...partnerForm, address: e.target.value })}
                      className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      placeholder="Ex: Av. Paulista, 1000"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-brand-text mb-1">Bairro</label>
                      <input
                        type="text"
                        value={partnerForm.neighborhood}
                        onChange={e => setPartnerForm({ ...partnerForm, neighborhood: e.target.value })}
                        className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                        placeholder="Bela Vista"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-text mb-1">Cidade *</label>
                      <input
                        type="text"
                        required
                        value={partnerForm.city}
                        onChange={e => setPartnerForm({ ...partnerForm, city: e.target.value })}
                        className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                        placeholder="São Paulo"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-brand-text mb-1">UF *</label>
                      <input
                        type="text"
                        required
                        maxLength={2}
                        value={partnerForm.state}
                        onChange={e => setPartnerForm({ ...partnerForm, state: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal uppercase font-mono"
                        placeholder="SP"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-medium text-brand-text-muted mb-1">Latitude (Opcional)</label>
                      <input
                        type="text"
                        value={partnerForm.latitude}
                        onChange={e => setPartnerForm({ ...partnerForm, latitude: e.target.value })}
                        className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                        placeholder="-23.561684"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-brand-text-muted mb-1">Longitude (Opcional)</label>
                      <input
                        type="text"
                        value={partnerForm.longitude}
                        onChange={e => setPartnerForm({ ...partnerForm, longitude: e.target.value })}
                        className="w-full px-3 py-2 bg-brand-surface border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                        placeholder="-46.655981"
                      />
                    </div>
                  </div>
                </div>

                {/* Opções de Ativação e Destaque */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-text">
                    <input
                      type="checkbox"
                      checked={partnerForm.is_featured}
                      onChange={e => setPartnerForm({ ...partnerForm, is_featured: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-teal focus:ring-brand-teal accent-brand-teal"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Exibir no Carrossel de Anúncios Rotativos em Destaque</span>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-brand-border-strong">
                  <button
                    type="button"
                    onClick={() => setIsPartnerModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-brand-surface-2 text-brand-text text-xs font-semibold hover:bg-brand-surface transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-colors shadow-sm"
                  >
                    Salvar Parceiro & Anúncio
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
