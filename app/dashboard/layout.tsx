'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { checkTutorSubscriptionStatus, verifyAndUnlockSubscription } from '@/lib/asaas';
import { isModuleActive, SYSTEM_MODULE_KEYS } from '@/lib/moduleService';
import {
  MessageSquare, CreditCard, Activity, TerminalSquare,
  Package, LogOut, User, Dog, History, Shield, Zap,
  BrainCircuit, Users, Globe, ChevronDown, Check, Smartphone, 
  AlertTriangle, QrCode, Copy, CheckCircle2, RefreshCw, ExternalLink, Lock, FileText,
  MapPin, UserCheck, Building, ShieldCheck, Menu, X
} from 'lucide-react';
import { triggerPWAInstallModal } from '@/components/PwaInstallPrompt';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [role, setRole] = useState<'tutor' | 'admin' | 'super_admin'>(() => {
    if (typeof window !== 'undefined') {
      const localRole = localStorage.getItem('vetpro_user_role');
      if (localRole === 'super_admin' || localRole === 'admin' || localRole === 'tutor') return localRole;
    }
    return 'tutor';
  });
  const [profileName, setProfileName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_tutor_name') || 'Tutor Conectado';
    }
    return 'Tutor Conectado';
  });
  const [userEmail, setUserEmail] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_user_email') || '';
    }
    return '';
  });
  const [planName, setPlanName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const plan = localStorage.getItem('vetpro_selected_plan');
      return plan === 'especialista' ? 'Especialista' : 'Essencial';
    }
    return 'Essencial';
  });
  const [loading, setLoading] = useState(true);
  const [hasActivePlan, setHasActivePlan] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return checkTutorSubscriptionStatus().hasActivePlan;
    }
    return false;
  });
  
  // Payment states for locked modal
  const [customerId, setCustomerId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_asaas_customer_id') || '';
    }
    return '';
  });
  const [subscriptionId, setSubscriptionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_asaas_subscription_id') || '';
    }
    return '';
  });
  const [paymentUrl, setPaymentUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_payment_url') || '';
    }
    return '';
  });
  const [bankSlipUrl, setBankSlipUrl] = useState('');
  const [identificationField, setIdentificationField] = useState('');
  const [pixQrCode, setPixQrCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_pix_qrcode') || '';
    }
    return '';
  });
  const [pixCopiaECola, setPixCopiaECola] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_pix_copia_cola') || '';
    }
    return '';
  });
  const [paymentModalTab, setPaymentModalTab] = useState<'pix' | 'card' | 'boleto'>('pix');
  const [isCopied, setIsCopied] = useState(false);
  const [isCopiedBoleto, setIsCopiedBoleto] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [paymentCheckFeedback, setPaymentCheckFeedback] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  // Active View derived directly from current pathname and verified role
  const activeView: 'tutor' | 'admin' | 'super_admin' = (() => {
    if (role === 'super_admin') {
      if (pathname.startsWith('/dashboard/admin')) return 'admin';
      if (pathname.startsWith('/dashboard/super')) return 'super_admin';
      return 'tutor';
    }
    if (role === 'admin') {
      if (pathname.startsWith('/dashboard/admin')) return 'admin';
      return 'tutor';
    }
    return 'tutor';
  })();

  // 1. Session & Profile Initialization on Mount
  useEffect(() => {
    let isMounted = true;

    async function processSession(session: any) {
      if (!isMounted) return;

      if (!session?.user) {
        // Tutor visitante ou sem login prévio
        const subStatus = checkTutorSubscriptionStatus();
        setHasActivePlan(subStatus.hasActivePlan);
        const localName = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') : null;
        setProfileName(localName || 'Tutor Conectado');
        setRole('tutor');
        setLoading(false);
        return;
      }

      const email = session.user.email?.toLowerCase() || '';
      setUserEmail(email);
      if (typeof window !== 'undefined') {
        localStorage.setItem('vetpro_user_email', email);
      }

      const isSuperAdminEmail = email === 'marcelobfo@gmail.com' || email.includes('admin@vetpro');

      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (profile?.role === 'super_admin' || isSuperAdminEmail) {
          setRole('super_admin');
          setProfileName(profile?.full_name || 'Marcelo (Super Admin)');
          setHasActivePlan(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vetpro_user_role', 'super_admin');
            localStorage.setItem('vetpro_tutor_name', profile?.full_name || 'Marcelo');
          }
        } else if (profile?.role === 'admin' || profile?.role === 'veterinario') {
          setRole('admin');
          setProfileName(profile?.full_name || 'Veterinário / Administrador');
          setHasActivePlan(true);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vetpro_user_role', 'admin');
            localStorage.setItem('vetpro_tutor_name', profile?.full_name || 'Veterinário');
          }
        } else {
          setRole('tutor');
          const resolvedName = profile?.full_name || email.split('@')[0] || 'Tutor';
          setProfileName(resolvedName);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vetpro_user_role', 'tutor');
            localStorage.setItem('vetpro_tutor_name', resolvedName);
          }
          
          if (profile?.plan_name) setPlanName(profile.plan_name);
          setCustomerId(profile?.asaas_customer_id || '');
          setSubscriptionId(profile?.subscription_id || '');

          const subStatus = checkTutorSubscriptionStatus(email);
          const isDbActive = profile?.subscription_status === 'ACTIVE' || profile?.subscription_status === 'CONFIRMED' || profile?.subscription_status === 'RECEIVED';
          // Um tutor só tem plano ativo se estiver confirmado no banco/Asaas
          const isPlanActive = isDbActive;
          setHasActivePlan(isPlanActive);

          // Sincronizar status local apenas se realmente ativo no banco
          if (isDbActive) {
            localStorage.setItem(`vetpro_sub_status_${email.toLowerCase().trim()}`, 'ACTIVE');
            localStorage.setItem(`vetpro_sub_paid_${email.toLowerCase().trim()}`, 'true');
          } else {
            localStorage.setItem(`vetpro_sub_status_${email.toLowerCase().trim()}`, profile?.subscription_status || 'PENDING_PAYMENT');
            localStorage.removeItem(`vetpro_sub_paid_${email.toLowerCase().trim()}`);
          }
        }
      } catch {
        if (!isMounted) return;
        if (isSuperAdminEmail) {
          setRole('super_admin');
          setProfileName('Marcelo (Super Admin)');
          setHasActivePlan(true);
        } else {
          setRole('tutor');
          setProfileName(email.split('@')[0] || 'Tutor');
          const subStatus = checkTutorSubscriptionStatus();
          setHasActivePlan(subStatus.hasActivePlan);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await processSession(session);
      } catch (err) {
        console.warn('[DashboardLayout] Erro ao carregar sessão:', err);
        if (isMounted) setLoading(false);
      }
    }

    void initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        void processSession(newSession);
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 2. Protege rotas restritas se o tutor tentar acessar via URL direta
  useEffect(() => {
    if (!loading && role === 'tutor' && (pathname.startsWith('/dashboard/super') || pathname.startsWith('/dashboard/admin'))) {
      router.push('/dashboard');
    }
  }, [pathname, role, loading, router]);

  // Auto-render Pix QR code whenever payload is present
  useEffect(() => {
    if (pixCopiaECola && (!pixQrCode || !pixQrCode.startsWith('data:image'))) {
      QRCode.toDataURL(pixCopiaECola, {
        width: 350,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => {
          setPixQrCode(url);
          if (typeof window !== 'undefined') {
            localStorage.setItem('vetpro_pix_qrcode', url);
          }
        })
        .catch((err) => {
          console.warn('[Layout] Erro ao renderizar QR Code Pix:', err);
        });
    }
  }, [pixCopiaECola, pixQrCode]);

  // Listen for global unlock events triggered anywhere in the app
  useEffect(() => {
    const handleUnlock = () => {
      setHasActivePlan(true);
      setPaymentCheckFeedback('🎉 Assinatura confirmada e liberada em todo o sistema!');
    };
    window.addEventListener('vetpro_subscription_unlocked', handleUnlock);
    return () => {
      window.removeEventListener('vetpro_subscription_unlocked', handleUnlock);
    };
  }, []);

  const handleVerifyPayment = async () => {
    setIsCheckingPayment(true);
    setPaymentCheckFeedback(null);
    try {
      const result = await verifyAndUnlockSubscription({
        customerId,
        subscriptionId,
        email: userEmail,
      });

      if (result.success && result.paid) {
        setHasActivePlan(true);
        setPaymentCheckFeedback(result.message || '🎉 Pagamento confirmado com sucesso no Asaas! Acesso liberado.');
      } else if (result.success) {
        if (result.pixQrCodeImage) setPixQrCode(result.pixQrCodeImage);
        if (result.pixCopiaECola) setPixCopiaECola(result.pixCopiaECola);
        if (result.paymentUrl) setPaymentUrl(result.paymentUrl);
        if (result.bankSlipUrl) setBankSlipUrl(result.bankSlipUrl);
        if (result.identificationField) setIdentificationField(result.identificationField);
        setPaymentCheckFeedback(result.message || 'Fatura pendente no gateway. Pague via Pix, Cartão ou Boleto para liberar.');
      } else {
        setPaymentCheckFeedback(result.message || 'Aguardando confirmação do gateway bancário.');
      }
    } catch {
      setPaymentCheckFeedback('Erro ao consultar o status do pagamento. Tente novamente em instantes.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    setPaymentCheckFeedback(null);
    try {
      const localCpf = typeof window !== 'undefined' ? localStorage.getItem('vetpro_user_cpf') || '' : '';
      const localName = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') || '' : '';
      const res = await fetch('/api/asaas/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          email: userEmail,
          name: localName || (userEmail ? userEmail.split('@')[0] : 'Tutor VetPro'),
          cpfCnpj: localCpf || undefined,
          planName,
          forceNewCharge: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.customerId) {
          setCustomerId(data.customerId);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_asaas_customer_id', data.customerId);
        }
        if (data.subscriptionId) {
          setSubscriptionId(data.subscriptionId);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_asaas_subscription_id', data.subscriptionId);
        }
        if (data.paymentUrl || data.invoiceUrl) {
          const u = data.invoiceUrl || data.paymentUrl;
          setPaymentUrl(u);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_payment_url', u);
        }
        if (data.bankSlipUrl) {
          setBankSlipUrl(data.bankSlipUrl);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_bank_slip_url', data.bankSlipUrl);
        }
        if (data.identificationField) {
          setIdentificationField(data.identificationField);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_ident_field', data.identificationField);
        }
        if (data.pixQrCodeImage) {
          setPixQrCode(data.pixQrCodeImage);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_qrcode', data.pixQrCodeImage);
        }
        if (data.pixCopiaECola) {
          setPixCopiaECola(data.pixCopiaECola);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_copia_cola', data.pixCopiaECola);
        }
        setPaymentCheckFeedback('⚡ Fatura e QR Code Pix gerados no Asaas! Escaneie ou copie a chave abaixo.');
      } else {
        setPaymentCheckFeedback(data.error || 'Erro ao gerar fatura no Asaas.');
      }
    } catch {
      setPaymentCheckFeedback('Erro de conexão ao gerar fatura.');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleCopyBoleto = () => {
    if (!identificationField) return;
    navigator.clipboard.writeText(identificationField);
    setIsCopiedBoleto(true);
    setTimeout(() => setIsCopiedBoleto(false), 3000);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erro eventual de rede
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vetpro_user_role');
      localStorage.removeItem('vetpro_user_email');
      localStorage.removeItem('vetpro_tutor_name');
      localStorage.removeItem('vetpro_subscription_status');
    }
    router.push('/login');
  };

  const [isPartnersModuleEnabled, setIsPartnersModuleEnabled] = useState<boolean>(() => {
    return isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS);
  });

  useEffect(() => {
    const handleModulesUpdate = () => {
      setIsPartnersModuleEnabled(isModuleActive(SYSTEM_MODULE_KEYS.PARCEIROS_GPS));
    };
    window.addEventListener('vetpro_modules_changed', handleModulesUpdate);
    return () => window.removeEventListener('vetpro_modules_changed', handleModulesUpdate);
  }, []);

  const tutorNavItems = [
    { name: 'Início do Tutor', href: '/dashboard', icon: User },
    { name: 'Meu Perfil (Dados)', href: '/dashboard/perfil', icon: UserCheck },
    { name: 'Triagem AI (Chat)', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Meus Pets', href: '/dashboard/pets', icon: Dog },
    ...(isPartnersModuleEnabled ? [{ name: 'Rede de Parceiros & GPS', href: '/dashboard/parceiros', icon: MapPin }] : []),
    { name: 'Histórico', href: '/dashboard/historico', icon: History },
    { name: 'Assinatura & Faturas', href: '/dashboard/assinatura', icon: CreditCard },
    { name: 'Privacidade & LGPD', href: '/dashboard/privacidade', icon: ShieldCheck },
  ];

  const adminNavItems = [
    { name: 'Visão Geral (Clínica)', href: '/dashboard/admin', icon: Activity },
    { name: 'Central de Cadastros', href: '/dashboard/admin/cadastros', icon: UserCheck },
    ...(isPartnersModuleEnabled ? [{ name: 'Rede de Parceiros', href: '/dashboard/parceiros', icon: MapPin }] : []),
    { name: 'WhatsApp & Evolution', href: '/dashboard/admin/whatsapp', icon: Smartphone },
    { name: 'Asaas & Pagamentos', href: '/dashboard/admin/asaas', icon: CreditCard },
    { name: 'Usuários & Permissões', href: '/dashboard/admin/usuarios', icon: Users },
    { name: 'Configuração da IA', href: '/dashboard/admin/ia-config', icon: BrainCircuit },
    { name: 'Gestão de Módulos', href: '/dashboard/admin/modulos', icon: Zap },
    { name: 'Automações (Scripts)', href: '/dashboard/automacoes', icon: TerminalSquare },
    { name: 'Privacidade & LGPD', href: '/dashboard/privacidade', icon: ShieldCheck },
  ];

  const superAdminNavItems = [
    { name: 'Painel Global', href: '/dashboard/super', icon: Globe },
    { name: 'Central de Cadastros', href: '/dashboard/admin/cadastros', icon: UserCheck },
    { name: 'Todas as Clínicas (Tenants)', href: '/dashboard/super/tenants', icon: Package },
    { 
      name: isPartnersModuleEnabled ? 'Rede de Parceiros & GPS' : 'Rede de Parceiros (Pausado)', 
      href: '/dashboard/parceiros', 
      icon: MapPin 
    },
    { name: 'WhatsApp & Evolution', href: '/dashboard/admin/whatsapp', icon: Smartphone },
    { name: 'Asaas & Pagamentos', href: '/dashboard/admin/asaas', icon: CreditCard },
    { name: 'Usuários do Sistema', href: '/dashboard/admin/usuarios', icon: Users },
    { name: 'Configuração da IA', href: '/dashboard/admin/ia-config', icon: BrainCircuit },
    { name: 'Automações & Scripts', href: '/dashboard/automacoes', icon: TerminalSquare },
    { name: 'Gestão de Módulos', href: '/dashboard/admin/modulos', icon: Zap },
    { name: 'Privacidade & LGPD', href: '/dashboard/privacidade', icon: ShieldCheck },
  ];

  let currentNavItems = tutorNavItems;
  if (activeView === 'admin') currentNavItems = adminNavItems;
  if (activeView === 'super_admin') currentNavItems = superAdminNavItems;

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center gap-3 text-brand-teal">
        <div className="w-8 h-8 border-2 border-brand-teal border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Carregando painel...</span>
      </div>
    );
  }

  // Se for tutor e não tiver plano ativo, e estiver tentando acessar áreas de triagem/pets sem assinatura:
  const isBlockedTutor = role === 'tutor' && !hasActivePlan && (pathname === '/dashboard/chat' || pathname === '/dashboard/pets' || pathname === '/dashboard/historico');

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col md:flex-row">
      {/* 📱 Mobile Header (visível apenas em telas menores que md) */}
      <header className="md:hidden h-16 border-b border-brand-border-strong bg-brand-surface-2/95 backdrop-blur-md px-4 flex items-center justify-between shrink-0 sticky top-0 z-30 shadow-sm">
        <Link 
          href={role === 'super_admin' ? '/dashboard/super' : role === 'admin' ? '/dashboard/admin' : '/dashboard'} 
          className="flex items-center gap-2 font-display font-bold text-[16px] text-brand-text"
        >
          <span className="w-7 h-7 rounded-lg bg-brand-accent/15 flex items-center justify-center text-sm">
            🐾
          </span>
          <span>VetPro <b className="text-brand-teal">Painel</b></span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand-teal/15 text-brand-teal flex items-center justify-center border border-brand-teal/30 font-bold text-xs">
            {profileName.charAt(0).toUpperCase()}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text hover:text-brand-teal transition-colors active:scale-95"
            aria-label="Abrir Menu de Navegação"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* 📱 Mobile Drawer Backdrop (Overlay quando menu mobile estiver aberto) */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* 📱 Mobile Drawer (Menu lateral que colapsa 100% no mobile) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-brand-bg-elevated border-r border-brand-border-strong flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-brand-border-strong shrink-0">
          <Link 
            href={role === 'super_admin' ? '/dashboard/super' : role === 'admin' ? '/dashboard/admin' : '/dashboard'} 
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 font-display font-bold text-[17px]"
          >
            <span className="w-8 h-8 rounded-xl bg-brand-accent/15 flex items-center justify-center text-[16px]">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Painel</b></span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors"
            aria-label="Fechar Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector for Super Admins / Admins */}
        {(role === 'super_admin' || role === 'admin') && (
          <div className="p-3 border-b border-brand-border-strong bg-brand-surface/60 shrink-0">
            <div className="text-[11px] font-semibold text-brand-text-muted uppercase tracking-wider mb-2 px-1">
              Visualização Atual
            </div>
            <div className="grid grid-cols-1 gap-1">
              {role === 'super_admin' && (
                <button
                  onClick={() => { router.push('/dashboard/super'); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'super_admin' 
                      ? 'bg-brand-teal text-brand-bg shadow-sm' 
                      : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                  }`}
                >
                  <span className="flex items-center gap-1.5">👑 Super Admin</span>
                  {activeView === 'super_admin' && <Check className="w-3.5 h-3.5" />}
                </button>
              )}
              
              <button
                onClick={() => { router.push('/dashboard/admin'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'admin' 
                    ? 'bg-brand-teal text-brand-bg shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                }`}
              >
                <span className="flex items-center gap-1.5">🏥 Admin / Veterinário</span>
                {activeView === 'admin' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => { router.push('/dashboard'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'tutor' 
                    ? 'bg-brand-teal text-brand-bg shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                }`}
              >
                <span className="flex items-center gap-1.5">🐾 Visão do Tutor</span>
                {activeView === 'tutor' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          {currentNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                  isActive 
                    ? 'bg-brand-surface text-brand-text font-semibold border border-brand-border-strong shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface/50 border border-transparent'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-brand-teal' : ''}`} />
                <span>{item.name}</span>
                {role === 'tutor' && !hasActivePlan && (item.href === '/dashboard/chat' || item.href === '/dashboard/pets') && (
                  <Lock className="w-3 h-3 text-amber-400 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status do Plano para o Tutor */}
        {role === 'tutor' && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-brand-surface border border-brand-border-strong text-xs shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-brand-text truncate">Plano {planName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                hasActivePlan ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {hasActivePlan ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {hasActivePlan ? 'Ativo' : 'Inativo (Pendente)'}
              </span>
            </div>
            <p className="text-[11px] text-brand-text-muted leading-tight">
              {hasActivePlan 
                ? 'Acesso total liberado.' 
                : 'Acesso travado. Efetue o pagamento.'}
            </p>
          </div>
        )}

        <div className="p-4 border-t border-brand-border-strong bg-brand-bg-elevated/50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0 border border-brand-teal/30 font-bold text-xs">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-brand-text">
                {profileName}
              </p>
              <p className="text-[10.5px] text-brand-text-muted truncate capitalize">
                {role === 'super_admin' ? '👑 Super Admin' : role === 'admin' ? '🩺 Veterinário / Admin' : `🐾 Tutor (${planName})`}
              </p>
            </div>
          </div>
          <button 
            onClick={() => { setMobileMenuOpen(false); handleLogout(); }} 
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-xs font-medium text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* 💻 Desktop Sidebar (Fixa e visível em md+) */}
      <aside className="hidden md:flex w-64 border-r border-brand-border-strong bg-brand-surface-2/40 flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="h-[76px] flex items-center justify-between px-6 border-b border-brand-border-strong shrink-0">
          <Link href={role === 'super_admin' ? '/dashboard/super' : role === 'admin' ? '/dashboard/admin' : '/dashboard'} className="flex items-center gap-2.5 font-display font-bold text-[18px]">
            <span className="w-[30px] h-[30px] rounded-lg bg-brand-accent/15 flex items-center justify-center text-[15px]">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Painel</b></span>
          </Link>
        </div>

        {/* Mode Selector for Super Admins / Admins */}
        {(role === 'super_admin' || role === 'admin') && (
          <div className="p-3 border-b border-brand-border-strong bg-brand-surface/60">
            <div className="text-[11px] font-semibold text-brand-text-muted uppercase tracking-wider mb-2 px-1">
              Visualização Atual
            </div>
            <div className="grid grid-cols-1 gap-1">
              {role === 'super_admin' && (
                <button
                  onClick={() => router.push('/dashboard/super')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeView === 'super_admin' 
                      ? 'bg-brand-teal text-brand-bg shadow-sm' 
                      : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                  }`}
                >
                  <span className="flex items-center gap-1.5">👑 Super Admin</span>
                  {activeView === 'super_admin' && <Check className="w-3.5 h-3.5" />}
                </button>
              )}
              
              <button
                onClick={() => router.push('/dashboard/admin')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'admin' 
                    ? 'bg-brand-teal text-brand-bg shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                }`}
              >
                <span className="flex items-center gap-1.5">🏥 Admin / Veterinário</span>
                {activeView === 'admin' && <Check className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'tutor' 
                    ? 'bg-brand-teal text-brand-bg shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface'
                }`}
              >
                <span className="flex items-center gap-1.5">🐾 Visão do Tutor</span>
                {activeView === 'tutor' && <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}
        
        <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto">
          {currentNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] transition-colors ${
                  isActive 
                    ? 'bg-brand-surface text-brand-text font-semibold border border-brand-border-strong shadow-sm' 
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface/50 border border-transparent'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-brand-teal' : ''}`} />
                <span>{item.name}</span>
                {role === 'tutor' && !hasActivePlan && (item.href === '/dashboard/chat' || item.href === '/dashboard/pets') && (
                  <Lock className="w-3 h-3 text-amber-400 ml-auto" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Status do Plano para o Tutor */}
        {role === 'tutor' && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-brand-surface border border-brand-border-strong text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-brand-text truncate">Plano {planName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                hasActivePlan ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {hasActivePlan ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {hasActivePlan ? 'Ativo' : 'Inativo (Pendente)'}
              </span>
            </div>
            <p className="text-[11px] text-brand-text-muted leading-tight mb-2">
              {hasActivePlan 
                ? 'Acesso total ao plano liberado.' 
                : 'Acesso travado. Efetue o pagamento para liberar.'}
            </p>
            {!hasActivePlan && (
              <div className="space-y-1.5">
                <button
                  onClick={handleVerifyPayment}
                  disabled={isCheckingPayment}
                  className="w-full py-1.5 px-2 rounded-lg bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                  {isCheckingPayment ? 'Checando...' : 'Verificar Pagamento'}
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={isGeneratingInvoice}
                  className="w-full py-1.5 px-2 rounded-lg bg-brand-surface-2 hover:bg-brand-surface border border-brand-border text-brand-text text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <CreditCard className={`w-3 h-3 ${isGeneratingInvoice ? 'animate-spin text-brand-teal' : ''}`} />
                  {isGeneratingInvoice ? 'Gerando Fatura...' : 'Gerar / Ver Fatura'}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="p-3 mx-3 mb-2">
          <button
            type="button"
            onClick={triggerPWAInstallModal}
            className="w-full py-2 px-3 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Baixar App (PWA)</span>
          </button>
        </div>

        <div className="p-4 border-t border-brand-border-strong bg-brand-bg-elevated/50 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0 border border-brand-teal/30 font-bold text-xs">
              {profileName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate text-brand-text">
                {profileName}
              </p>
              <p className="text-[10.5px] text-brand-text-muted truncate capitalize">
                {role === 'super_admin' ? '👑 Super Admin' : role === 'admin' ? '🩺 Veterinário / Admin' : `🐾 Tutor (${planName})`}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-xs font-medium text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper - 100% largura no mobile */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        <main className="flex-1 flex flex-col min-w-0 w-full overflow-y-auto">
        {isBlockedTutor ? (
          <div className="p-6 md:p-10 h-full flex items-center justify-center overflow-y-auto">
            <div className="w-full max-w-xl bg-brand-surface border-2 border-amber-500/40 rounded-3xl p-6 md:p-8 text-center space-y-5 shadow-2xl my-auto">
              
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h2 className="font-display text-xl md:text-2xl font-bold text-brand-text mb-1.5">
                  Acesso Travado: Aguardando Pagamento
                </h2>
                <p className="text-xs md:text-sm text-brand-text-muted leading-relaxed">
                  Para utilizar a <b className="text-brand-text">Triagem com IA</b> e a <b className="text-brand-text">Gestão de Pets</b> do seu <b>Plano {planName}</b>, realize o pagamento da fatura emitida no Asaas abaixo.
                </p>
              </div>

              {/* Seletor de Abas de Pagamento no Modal */}
              <div className="flex items-center justify-center p-1 bg-brand-surface-2 rounded-2xl border border-brand-border-strong text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentModalTab('pix')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    paymentModalTab === 'pix' ? 'bg-brand-teal text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" /> Pix
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModalTab('card')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    paymentModalTab === 'card' ? 'bg-brand-teal text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" /> Cartão
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModalTab('boleto')}
                  className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    paymentModalTab === 'boleto' ? 'bg-brand-teal text-brand-bg shadow-sm' : 'text-brand-text-muted hover:text-brand-text'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Boleto
                </button>
              </div>

              {/* Conteúdo Aba PIX */}
              {paymentModalTab === 'pix' && (
                <div className="p-4 rounded-2xl bg-brand-surface-2 border-2 border-brand-teal/30 text-left">
                  <div className="flex items-center justify-between pb-2.5 border-b border-brand-border-strong mb-3">
                    <span className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" /> Pagamento Instantâneo via Pix
                    </span>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                      Compensação Imediata
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="p-2.5 bg-white rounded-2xl shrink-0 border-2 border-gray-200 shadow-md">
                      {pixQrCode ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={pixQrCode} alt="QR Code Pix" className="w-32 h-32 object-contain" />
                      ) : (
                        <div className="w-32 h-32 bg-gray-50 rounded-xl flex flex-col items-center justify-center text-gray-400 text-[10px] text-center p-2">
                          <QrCode className="w-6 h-6 mb-1 opacity-50 text-gray-400" />
                          <span>Clique abaixo em &quot;Gerar Pix Agora&quot;</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2.5 text-xs w-full">
                      <p className="text-brand-text-muted text-[11px] leading-relaxed">
                        Aponte a câmera do seu banco para o QR Code ou use a chave Copia e Cola:
                      </p>
                      {pixCopiaECola ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="text" 
                              readOnly 
                              value={pixCopiaECola} 
                              className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-2.5 py-2 text-[10px] font-mono text-brand-text truncate focus:outline-none select-all"
                            />
                            <button
                              type="button"
                              onClick={handleCopyPix}
                              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                                isCopied ? 'bg-emerald-500 text-brand-bg' : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
                              }`}
                            >
                              {isCopied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              {isCopied ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateInvoice}
                          disabled={isGeneratingInvoice}
                          className="w-full py-2.5 px-3 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          <Zap className={`w-3.5 h-3.5 ${isGeneratingInvoice ? 'animate-spin' : ''}`} />
                          {isGeneratingInvoice ? 'Gerando...' : '⚡ Gerar QR Code Pix Agora'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Conteúdo Aba CARTÃO */}
              {paymentModalTab === 'card' && (
                <div className="p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong text-left space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-brand-border-strong">
                    <span className="text-xs font-bold text-brand-teal flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" /> Pagamento com Cartão de Crédito
                    </span>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-2 py-0.5 rounded-full">
                      Liberação na Hora
                    </span>
                  </div>

                  <p className="text-xs text-brand-text-muted">
                    Você pode preencher o cartão diretamente no painel de assinatura ou abrir o checkout seguro do Asaas.
                  </p>

                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href="/dashboard/assinatura"
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <CreditCard className="w-4 h-4" />
                      Preencher Cartão de Crédito no App
                    </Link>
                    {paymentUrl && (
                      <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-surface border border-brand-border-strong hover:bg-brand-surface-2 text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Pagar no Checkout Online Asaas
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Conteúdo Aba BOLETO */}
              {paymentModalTab === 'boleto' && (
                <div className="p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong text-left space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-brand-border-strong">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4" /> Pagamento por Boleto Bancário
                    </span>
                    <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold px-2 py-0.5 rounded-full">
                      1-2 dias úteis
                    </span>
                  </div>

                  {identificationField && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-brand-text block">Linha Digitável:</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="text" 
                          readOnly 
                          value={identificationField} 
                          className="w-full bg-brand-bg border border-brand-border-strong rounded-lg px-2 py-1.5 text-[10px] font-mono text-brand-text-muted truncate focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCopyBoleto}
                          className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                            isCopiedBoleto ? 'bg-emerald-500 text-brand-bg' : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
                          }`}
                        >
                          {isCopiedBoleto ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {isCopiedBoleto ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    {bankSlipUrl ? (
                      <a
                        href={bankSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <FileText className="w-4 h-4" />
                        Baixar Boleto Bancário em PDF <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : paymentUrl ? (
                      <a
                        href={paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <FileText className="w-4 h-4" />
                        Abrir Fatura do Boleto no Asaas <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateInvoice}
                        disabled={isGeneratingInvoice}
                        className="w-full py-2 rounded-lg bg-brand-teal/15 text-brand-teal border border-brand-teal/30 text-xs font-bold hover:bg-brand-teal/25"
                      >
                        {isGeneratingInvoice ? 'Gerando...' : 'Gerar Boleto no Asaas'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="space-y-2.5">
                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pagar no Asaas (Cartão de Crédito ou Boleto) <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleVerifyPayment}
                    disabled={isCheckingPayment}
                    className="py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                    {isCheckingPayment ? 'Verificando...' : 'Verificar Pagamento'}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateInvoice}
                    disabled={isGeneratingInvoice}
                    className="py-3 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Zap className={`w-4 h-4 ${isGeneratingInvoice ? 'animate-spin' : ''}`} />
                    {isGeneratingInvoice ? 'Gerando...' : '⚡ Reemitir Fatura & Pix'}
                  </button>
                </div>

                <Link
                  href="/dashboard/assinatura"
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border text-brand-teal font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Ver Detalhes da Assinatura & Trocar de Plano
                </Link>
              </div>

              {paymentCheckFeedback && (
                <div className="p-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-xs text-brand-teal font-medium">
                  {paymentCheckFeedback}
                </div>
              )}

              <div className="pt-2 text-[11.5px] text-brand-text-muted">
                Dúvidas ou problemas com o pagamento? <Link href="/dashboard" className="text-brand-teal hover:underline font-bold">Voltar ao Início</Link> ou chame no WhatsApp de suporte.
              </div>
            </div>
          </div>
        ) : (
          children
        )}
        </main>
      </div>
    </div>
  );
}
