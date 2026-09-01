'use client';

import { useState, useEffect } from 'react';
import { 
  Dog, MessageSquare, Star, ArrowRight, ShieldCheck, 
  AlertTriangle, QrCode, Copy, CheckCircle2, RefreshCw, 
  CreditCard, ExternalLink, Plus, History, Lock, FileText
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import { getSavedPets, PetRecord, getChatSessions, ChatSessionRecord } from '@/lib/petService';
import { checkTutorSubscriptionStatus, verifyAndUnlockSubscription } from '@/lib/asaas';

export default function TutorDashboard() {
  const [tutorName, setTutorName] = useState('Tutor');
  const [userEmail, setUserEmail] = useState('');
  const [planName, setPlanName] = useState('Essencial');
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [recentSessions, setRecentSessions] = useState<ChatSessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // PIX and Payment details
  const [customerId, setCustomerId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [bankSlipUrl, setBankSlipUrl] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixCopiaECola, setPixCopiaECola] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Local storage fallbacks
        const localName = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') : '';
        const localEmail = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_email') : '';
        const localPlan = typeof window !== 'undefined' ? localStorage.getItem('vetpro_selected_plan') : '';
        const localCustId = typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_customer_id') : '';
        const localSubId = typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_subscription_id') : '';
        const localPayUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_payment_url') : '';
        const localPixQr = typeof window !== 'undefined' ? localStorage.getItem('vetpro_pix_qrcode') : '';
        const localPixCode = typeof window !== 'undefined' ? localStorage.getItem('vetpro_pix_copia_cola') : '';

        if (localCustId) setCustomerId(localCustId);
        if (localSubId) setSubscriptionId(localSubId);
        if (localPayUrl) setPaymentUrl(localPayUrl);
        if (localPixQr) setPixQrCode(localPixQr);
        if (localPixCode) setPixCopiaECola(localPixCode);
        if (localPlan) setPlanName(localPlan === 'especialista' ? 'Especialista' : 'Essencial');

        let currentUserId = session?.user?.id;
        let email = session?.user?.email?.toLowerCase() || localEmail || '';
        setUserEmail(email);

        if (session) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile) {
            setTutorName(profile.full_name || email.split('@')[0] || 'Tutor');
            if (profile.plan_name) setPlanName(profile.plan_name);
            if (profile.asaas_customer_id) setCustomerId(profile.asaas_customer_id);
            if (profile.subscription_id) setSubscriptionId(profile.subscription_id);

            const isDbActive = profile.subscription_status === 'ACTIVE' || profile.subscription_status === 'CONFIRMED' || profile.subscription_status === 'RECEIVED';
            const sub = checkTutorSubscriptionStatus();
            setHasActivePlan(isDbActive || sub.hasActivePlan);
          } else {
            setTutorName(localName || email.split('@')[0] || 'Tutor');
            const sub = checkTutorSubscriptionStatus();
            setHasActivePlan(sub.hasActivePlan);
          }
        } else {
          setTutorName(localName || 'Tutor');
          const sub = checkTutorSubscriptionStatus();
          setHasActivePlan(sub.hasActivePlan);
        }

        // Carrega pets específicos do tutor
        const userPets = await getSavedPets(currentUserId);
        setPets(userPets);

        // Carrega histórico de triagens
        const sessions = await getChatSessions();
        setRecentSessions(sessions.slice(0, 3));
      } catch (err) {
        console.error('Erro ao carregar dados do tutor:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Listen for global unlock events triggered anywhere in the app
  useEffect(() => {
    const handleUnlock = () => {
      setHasActivePlan(true);
      setPaymentFeedback('🎉 Pagamento confirmado com sucesso! Seu acesso está 100% liberado.');
    };
    window.addEventListener('vetpro_subscription_unlocked', handleUnlock);
    return () => {
      window.removeEventListener('vetpro_subscription_unlocked', handleUnlock);
    };
  }, []);

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
          console.warn('[Dashboard] Erro ao renderizar QR Code Pix:', err);
        });
    }
  }, [pixCopiaECola, pixQrCode]);

  const handleVerifyPayment = async () => {
    setIsCheckingPayment(true);
    setPaymentFeedback(null);
    try {
      const result = await verifyAndUnlockSubscription({
        customerId,
        subscriptionId,
        email: userEmail,
      });

      if (result.success && result.paid) {
        setHasActivePlan(true);
        setPaymentFeedback(result.message || '🎉 Pagamento confirmado com sucesso! Seu acesso está 100% liberado.');
      } else if (result.success) {
        if (result.pixQrCodeImage) setPixQrCode(result.pixQrCodeImage);
        if (result.pixCopiaECola) setPixCopiaECola(result.pixCopiaECola);
        if (result.paymentUrl) setPaymentUrl(result.paymentUrl);
        if (result.bankSlipUrl) setBankSlipUrl(result.bankSlipUrl);
        setPaymentFeedback(result.message || 'Fatura ainda não consta como paga no Asaas. Efetue o pagamento para liberar.');
      } else {
        setPaymentFeedback(result.message || 'Aguardando sincronização de fatura no Asaas.');
      }
    } catch {
      setPaymentFeedback('Erro ao verificar pagamento. Tente novamente.');
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setIsGeneratingInvoice(true);
    setPaymentFeedback(null);
    try {
      const res = await fetch('/api/asaas/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          email: userEmail,
          planName,
          forceNewCharge: false,
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
        if (data.paymentUrl) {
          setPaymentUrl(data.paymentUrl);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_payment_url', data.paymentUrl);
        }
        if (data.pixQrCodeImage) {
          setPixQrCode(data.pixQrCodeImage);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_qrcode', data.pixQrCodeImage);
        }
        if (data.pixCopiaECola) {
          setPixCopiaECola(data.pixCopiaECola);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_copia_cola', data.pixCopiaECola);
        }
        setPaymentFeedback('Fatura localizada/gerada com sucesso! Efetue o pagamento via Pix ou Cartão.');
      } else {
        setPaymentFeedback(data.error || 'Erro ao gerar fatura no Asaas.');
      }
    } catch {
      setPaymentFeedback('Erro de conexão ao gerar fatura.');
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

  const firstName = tutorName.split(' ')[0];

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-1">
              Olá, <span className="text-brand-teal">{firstName}</span>! 🐾
            </h1>
            <p className="text-brand-text-muted text-xs md:text-sm">
              Bem-vindo(a) à sua central de orientação clínica e saúde dos seus pets.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
              hasActivePlan 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {hasActivePlan ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {hasActivePlan ? `Plano ${planName} Ativo` : `Plano ${planName} Inativo (Pendente)`}
            </span>
          </div>
        </div>

        {/* NOTIFICAÇÃO / BANNER SE O PAGAMENTO ESTIVER PENDENTE */}
        {!hasActivePlan && (
          <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-r from-brand-surface to-brand-surface-2 border-2 border-amber-500/40 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/40">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm md:text-base text-brand-text">
                  Acesso Travado: Confirme o Pagamento da sua Assinatura
                </h3>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  Os módulos de <b>Triagem IA</b> e <b>Gestão de Pets</b> estão temporariamente travados até a confirmação do pagamento no Asaas.
                </p>
              </div>
            </div>

            {/* Bloco Pix Imediato */}
            {pixQrCode && (
              <div className="p-4 bg-brand-bg rounded-xl border border-brand-border-strong flex flex-col md:flex-row items-center gap-4">
                <div className="p-2 bg-white rounded-lg shrink-0 border border-brand-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pixQrCode} alt="QR Code Pix" className="w-24 h-24 object-contain" />
                </div>
                <div className="flex-1 min-w-0 space-y-2 text-xs w-full">
                  <div className="font-bold text-brand-teal flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5" /> Pague via Pix com Liberação Automática
                  </div>
                  {pixCopiaECola && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value={pixCopiaECola} 
                        className="w-full bg-brand-surface border border-brand-border-strong rounded px-2 py-1 text-[11px] font-mono text-brand-text-muted truncate focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className={`shrink-0 px-2.5 py-1 rounded text-xs font-bold transition-all flex items-center gap-1 ${
                          isCopied ? 'bg-emerald-500 text-brand-bg' : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
                        }`}
                      >
                        {isCopied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? 'Copiado' : 'Copiar Pix'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link
                href="/dashboard/assinatura"
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Pagar com Cartão / Pix / Boleto <ArrowRight className="w-3 h-3" />
              </Link>

              {paymentUrl && (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border text-brand-text font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir Checkout Asaas
                </a>
              )}

              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={isCheckingPayment}
                className="px-4 py-2 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                {isCheckingPayment ? 'Verificando...' : 'Verificar Pagamento'}
              </button>

              <button
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isGeneratingInvoice}
                className="px-4 py-2 rounded-xl bg-brand-surface border border-brand-border-strong hover:bg-brand-surface-2 text-brand-text font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingInvoice ? 'animate-spin text-brand-teal' : ''}`} />
                {isGeneratingInvoice ? 'Gerando Fatura...' : 'Reemitir Fatura'}
              </button>
            </div>

            {paymentFeedback && (
              <p className="text-xs text-brand-teal font-medium">
                {paymentFeedback}
              </p>
            )}
          </div>
        )}

        {/* 3 Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Meus Pets */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex flex-col justify-between hover:border-brand-teal/40 transition-colors shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center mb-4">
                <Dog className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1 text-brand-text">Meus Pets</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                {loading ? 'Carregando pets...' : pets.length > 0 ? `Você tem ${pets.length} pet(s) cadastrado(s).` : 'Nenhum pet cadastrado no seu perfil.'}
              </p>
            </div>
            <div className="pt-5 border-t border-brand-border-strong/60 mt-4">
              <Link 
                href="/dashboard/pets" 
                className="text-xs font-bold text-brand-teal hover:text-brand-teal/80 flex items-center gap-1.5 transition-colors"
              >
                {pets.length > 0 ? 'Gerenciar prontuários' : 'Cadastrar primeiro pet'} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
          
          {/* Card 2: Nova Triagem */}
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex flex-col justify-between hover:border-brand-teal/40 transition-colors shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-accent/20 text-brand-accent-2 flex items-center justify-center mb-4">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1 text-brand-text">Triagem com IA</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Relate sintomas, comportamento e tire dúvidas clínicas guiadas pela nossa base técnica.
              </p>
            </div>
            <div className="pt-5 border-t border-brand-border-strong/60 mt-4">
              <Link 
                href="/dashboard/chat" 
                className="text-xs font-bold text-brand-accent-2 hover:text-brand-accent flex items-center gap-1.5 transition-colors"
              >
                Iniciar atendimento IA <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Plano Atual */}
          <div className="bg-gradient-to-br from-brand-surface to-brand-surface-2 border border-brand-border-strong rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-sm">
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-accent-ink border border-brand-accent/30 text-brand-accent-2 flex items-center justify-center mb-4">
                <Star className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base mb-1 text-brand-text">Plano {planName}</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Status: <b className={hasActivePlan ? 'text-emerald-400' : 'text-amber-400'}>{hasActivePlan ? 'Ativo' : 'Inativo'}</b>
              </p>
            </div>
            <div className="pt-5 border-t border-brand-border-strong/60 mt-4">
              <Link 
                href="/dashboard/assinatura" 
                className="text-xs font-bold text-brand-accent-2 hover:text-brand-accent flex items-center gap-1.5 transition-colors"
              >
                Detalhes da Assinatura <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Pets Registrados Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Pets Cadastrados no seu Perfil</h2>
            <Link 
              href="/dashboard/pets" 
              className="text-xs text-brand-teal hover:underline flex items-center gap-1 font-bold"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Pet
            </Link>
          </div>

          {pets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {pets.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/chat?petId=${p.id}`}
                  className="p-4 rounded-2xl bg-brand-surface border border-brand-border-strong hover:border-brand-teal/40 transition-all flex items-center gap-3.5 group shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-brand-surface-2 border border-brand-border-strong flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    {p.species?.toLowerCase().includes('gato') ? '🐱' : '🐶'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-brand-text truncate group-hover:text-brand-teal transition-colors">
                      {p.name}
                    </h4>
                    <p className="text-[11px] text-brand-text-muted truncate">
                      {p.breed || 'SRD'} • {p.age || 'Idade não informada'}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-teal group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-brand-surface border border-brand-border-strong text-center text-xs text-brand-text-muted">
              Você ainda não cadastrou nenhum pet no seu perfil.
              <div className="mt-3">
                <Link
                  href="/dashboard/pets"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Cadastrar Pet Agora
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Histórico Recente Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold">Histórico de Triagens</h2>
            <Link 
              href="/dashboard/historico" 
              className="text-xs text-brand-teal hover:underline font-bold"
            >
              Ver todos
            </Link>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden shadow-sm">
            {recentSessions.length > 0 ? (
              <div className="divide-y divide-brand-border-strong">
                {recentSessions.map((s) => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-4 hover:bg-brand-surface-2/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border-strong flex items-center justify-center text-xs shrink-0">
                        🐾
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-brand-text truncate">
                          {s.pet_name ? `Triagem: ${s.pet_name}` : s.summary || 'Orientação Clínica'}
                        </div>
                        <div className="text-[11px] text-brand-text-muted">
                          {new Date(s.updated_at || s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    <Link 
                      href={`/dashboard/chat?sessionId=${s.id}`} 
                      className="px-3 py-1.5 rounded-lg border border-brand-border-strong text-xs font-bold hover:bg-brand-surface-2 text-brand-teal transition-colors shrink-0"
                    >
                      Continuar
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-brand-text-muted">
                Nenhum histórico de triagem anterior encontrado.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
