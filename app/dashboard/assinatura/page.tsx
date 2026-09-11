'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import QRCode from 'qrcode';
import { 
  CheckCircle2, Zap, Lock, CreditCard, RefreshCw, QrCode, 
  Copy, ExternalLink, AlertCircle, FileText, 
  Sparkles, Check, Clock, ShieldCheck, Download,
  Wallet, X, MessageCircle, Send, Smartphone, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAsaasConfig, verifyAndUnlockSubscription, resolvePlanDetails } from '@/lib/asaas';
import { getEvolutionConfig } from '@/lib/evolution';

const AVAILABLE_PLANS = [
  {
    id: 'anual-promocional',
    name: 'Anual Essencial',
    badge: 'Mais Vendido • Economize 50%',
    price: 59.90,
    period: '/ano',
    billingCycle: 'YEARLY' as const,
    billingDesc: 'Equivale a apenas R$ 4,99/mês (Economia de 50%)',
    desc: 'O plano mais econômico: 1 ano completo de tranquilidade e proteção por apenas R$ 4,99 ao mês.',
    features: [
      'Economia imediata de 50% em relação ao mensal',
      'Acesso garantido por 365 dias sem interrupções',
      'Triagem e Anamnese Ativa com IA 24h Ilimitada',
      'Caderneta de Vacinas e Lembretes no WhatsApp',
      'Radar Comunitário de Pets Perdidos no Bairro',
      'GPS para Hospitais 24h e Pronto-Socorro',
    ],
    isPopular: true,
    isInactive: false,
  },
  {
    id: 'especialista',
    name: 'Especialista',
    badge: 'Orientação Avançada (Em Breve)',
    price: 29.90,
    period: '/mês',
    billingCycle: 'MONTHLY' as const,
    billingDesc: 'Cobrança mensal com especialista dedicado',
    desc: 'Apoio técnico veterinário com médico-veterinário especialista dedicado + IA.',
    features: [
      'Tudo do Plano Essencial incluído',
      'Orientação com Médico-Veterinário Especialista',
      'Prioridade na triagem e suporte clínico',
      'Segunda opinião em laudos e exames',
      'Acompanhamento de casos crônicos e idosos',
    ],
    isPopular: false,
    isInactive: true,
  },
  {
    id: 'essencial',
    name: 'Essencial Mensal',
    badge: 'Orientação Contínua',
    price: 9.90,
    period: '/mês',
    billingCycle: 'MONTHLY' as const,
    billingDesc: 'Cobrança mensal recorrente sem fidelidade',
    desc: 'Orientação técnica contínua com IA 24h para cães e gatos sem carência.',
    features: [
      'Triagem e Anamnese Ativa com IA 24h',
      'Cadastro e prontuário completo dos seus Pets',
      'Caderneta de Vacinação Digital com Lembretes',
      'Radar Comunitário de Pets Perdidos no Bairro',
      'GPS para Hospitais 24h e Pronto-Socorros',
    ],
    isPopular: false,
    isInactive: false,
  },
];

interface AsaasPaymentItem {
  id: string;
  invoiceNumber?: string;
  dateCreated: string;
  dueDate: string;
  originalDueDate?: string;
  paymentDate?: string | null;
  value: number;
  netValue?: number;
  billingType: string;
  status: string;
  rawStatus?: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  paymentLink?: string;
  pixCopiaECola?: string;
  pixQrCode?: string;
  isPaid?: boolean;
  isOverdue?: boolean;
  canBePaid?: boolean;
}

export default function AssinaturaPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userCpf, setUserCpf] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Plano e Asaas
  const [planId, setPlanId] = useState('essencial');
  const [planName, setPlanName] = useState('Essencial');
  const [planPrice, setPlanPrice] = useState(9.90);
  const [planBillingCycle, setPlanBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('PENDING_PAYMENT');
  
  // Modal de Troca de Plano
  const [showChangePlanModal, setShowChangePlanModal] = useState(false);
  const [targetPlanToChange, setTargetPlanToChange] = useState<typeof AVAILABLE_PLANS[0] | null>(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  
  const [customerId, setCustomerId] = useState('');
  const [subscriptionId, setSubscriptionId] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [bankSlipUrl, setBankSlipUrl] = useState('');
  const [identificationField, setIdentificationField] = useState('');
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixCopiaECola, setPixCopiaECola] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentValue, setPaymentValue] = useState<number>(9.90);

  // WhatsApp
  const [isSendingWhatsapp, setIsSendingWhatsapp] = useState(false);
  const [whatsappSentSuccess, setWhatsappSentSuccess] = useState<string | null>(null);
  const [customWhatsappUrl, setCustomWhatsappUrl] = useState<string>('');

  // Faturas e Status de Atraso (OVERDUE)
  const [invoices, setInvoices] = useState<AsaasPaymentItem[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [hasOverdue, setHasOverdue] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);
  const [overdueTotal, setOverdueTotal] = useState(0);
  const [overdueInvoices, setOverdueInvoices] = useState<AsaasPaymentItem[]>([]);
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'overdue' | 'pending' | 'paid'>('all');

  // Busca lista completa de faturas do cliente no Asaas sob demanda
  const fetchInvoices = useCallback(async (targetCustId?: string, targetSubId?: string, targetEmail?: string, targetUserId?: string) => {
    const custId = targetCustId || customerId;
    const subId = targetSubId || subscriptionId;
    const email = targetEmail || userEmail;
    const uId = targetUserId || userId;

    if (!custId && !subId && !email) return;

    setIsLoadingInvoices(true);
    try {
      const localAsaasConfig = getAsaasConfig();
      const res = await fetch(`/api/asaas/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: custId,
          subscriptionId: subId,
          email,
          userId: uId,
          limit: 20,
          asaasConfig: {
            apiKey: localAsaasConfig.apiKey,
            environment: localAsaasConfig.environment,
            customBaseUrl: localAsaasConfig.customBaseUrl,
          },
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.invoices)) {
        setInvoices(data.invoices);
        setHasOverdue(Boolean(data.hasOverdue));
        setOverdueCount(Number(data.overdueCount) || 0);
        setOverdueTotal(Number(data.overdueTotal) || 0);
        setOverdueInvoices(data.overdueInvoices || []);

        const openInvoice = data.overdueInvoices?.[0] || data.pendingInvoices?.[0] || data.invoices[0];
        if (openInvoice) {
          if (!paymentId || openInvoice.isOverdue) {
            setPaymentId(openInvoice.id);
            if (openInvoice.invoiceUrl) setPaymentUrl(openInvoice.invoiceUrl);
            if (openInvoice.bankSlipUrl) setBankSlipUrl(openInvoice.bankSlipUrl);
            if (openInvoice.pixCopiaECola) setPixCopiaECola(openInvoice.pixCopiaECola);
            if (openInvoice.pixQrCode) setPixQrCode(openInvoice.pixQrCode);
            if (openInvoice.dueDate) setPaymentDueDate(openInvoice.dueDate);
            if (openInvoice.value) setPaymentValue(openInvoice.value);
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar histórico de faturas:', e);
    } finally {
      setIsLoadingInvoices(false);
    }
  }, [customerId, subscriptionId, userEmail, userId, paymentId]);

  // Link direto de WhatsApp derivado
  const computedWhatsappUrl = useMemo(() => {
    if (!pixCopiaECola) return '';
    const targetPhone = (userPhone || '').replace(/\D/g, '');
    const waPhone = targetPhone.length === 10 || targetPhone.length === 11 ? `55${targetPhone}` : targetPhone;
    const isOver = hasOverdue || subscriptionStatus === 'OVERDUE';
    const waMsg = isOver
      ? `⚠️ *AVISO DE COBRANÇA - FATURA EM ATRASO*\n🐶 *VetPro Orienta*\n\nOlá, *${userName || 'Tutor'}*!\nIdentificamos que sua fatura do *Plano ${planName}* está em atraso.\n• *Fatura Asaas Nº:* \`${paymentId || 'Disponível no link'}\`\n• *Valor:* R$ ${paymentValue.toFixed(2).replace('.', ',')}\n\n⚡ *PAGAMENTO VIA PIX (Liberação Instantânea):*\n\`\`\`${pixCopiaECola}\`\`\`\n\n💳 *OU PAGUE COM CARTÃO / BOLETO:*\n${paymentUrl || 'https://vetpro.app'}`
      : `🐶 *VetPro Orienta - Fatura da sua Assinatura*\n\nOlá, *${userName || 'Tutor'}*!\nSua fatura para o *Plano ${planName}* (R$ ${paymentValue.toFixed(2).replace('.', ',')}/mês) está pronta.\n• *Fatura Asaas Nº:* \`${paymentId || 'Disponível no link'}\`\n\n⚡ *PAGAMENTO VIA PIX (Liberação Imediata):*\n\`\`\`${pixCopiaECola}\`\`\`\n\n💳 *OU PAGUE COM CARTÃO / BOLETO:*\n${paymentUrl || 'https://vetpro.app'}\n\nApós o pagamento, o acesso à Triagem e aos Pets é liberado na hora!`;
    
    return waPhone 
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
  }, [pixCopiaECola, userPhone, userName, planName, paymentValue, paymentUrl, hasOverdue, subscriptionStatus, paymentId]);

  const directWhatsappUrl = customWhatsappUrl || computedWhatsappUrl;

  // Aba selecionada de pagamento: 'pix' | 'card' | 'boleto'
  const [activePaymentTab, setActivePaymentTab] = useState<'pix' | 'card' | 'boleto'>('pix');

  // Formulário do Cartão de Crédito
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpiryMonth, setCardExpiryMonth] = useState('');
  const [cardExpiryYear, setCardExpiryYear] = useState('');
  const [cardCcv, setCardCcv] = useState('');
  const [cardHolderCpf, setCardHolderCpf] = useState('');
  const [cardHolderPhone, setCardHolderPhone] = useState('');
  const [cardHolderPostalCode, setCardHolderPostalCode] = useState('');
  const [cardHolderAddressNumber, setCardHolderAddressNumber] = useState('');
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // Estados de ação
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isCopiedPix, setIsCopiedPix] = useState(false);
  const [isCopiedBoleto, setIsCopiedBoleto] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showCpfModal, setShowCpfModal] = useState(false);
  const [tempCpf, setTempCpf] = useState('');
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  // Efeito para sincronização global de desbloqueio
  useEffect(() => {
    const handleGlobalUnlock = (e: any) => {
      if (e?.detail?.active) {
        setHasActivePlan(true);
        setSubscriptionStatus('ACTIVE');
        setHasOverdue(false);
        if (e.detail.planName) setPlanName(e.detail.planName);
        setActionFeedback({
          type: 'success',
          message: '🎉 Pagamento confirmado com sucesso! O sistema foi 100% liberado.',
        });
      }
    };

    window.addEventListener('vetpro_subscription_unlocked', handleGlobalUnlock);
    return () => {
      window.removeEventListener('vetpro_subscription_unlocked', handleGlobalUnlock);
    };
  }, []);

  // Efeito para renderizar QR Code Pix
  useEffect(() => {
    if (pixCopiaECola) {
      QRCode.toDataURL(pixCopiaECola, {
        width: 400,
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
          console.warn('[Assinatura] Falha ao renderizar QR Code Pix:', err);
        });
    }
  }, [pixCopiaECola]);

  // Carrega dados da sessão e Supabase
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        
        const localName = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_name') || '' : '';
        const localEmail = typeof window !== 'undefined' ? localStorage.getItem('vetpro_tutor_email') || '' : '';
        const localPlan = typeof window !== 'undefined' ? localStorage.getItem('vetpro_selected_plan') || 'essencial' : 'essencial';
        const localCustId = typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_customer_id') || '' : '';
        const localSubId = typeof window !== 'undefined' ? localStorage.getItem('vetpro_asaas_subscription_id') || '' : '';
        const localPayUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_payment_url') || '' : '';
        const localBankSlip = typeof window !== 'undefined' ? localStorage.getItem('vetpro_bank_slip_url') || '' : '';
        const localIdent = typeof window !== 'undefined' ? localStorage.getItem('vetpro_ident_field') || '' : '';
        const localPixQr = typeof window !== 'undefined' ? localStorage.getItem('vetpro_pix_qrcode') || '' : '';
        const localPixCode = typeof window !== 'undefined' ? localStorage.getItem('vetpro_pix_copia_cola') || '' : '';
        const localPhone = typeof window !== 'undefined' ? localStorage.getItem('vetpro_user_phone') || '' : '';
        const localCpf = typeof window !== 'undefined' ? localStorage.getItem('vetpro_user_cpf') || '' : '';

        if (localCustId) setCustomerId(localCustId);
        if (localSubId) setSubscriptionId(localSubId);
        if (localPayUrl) setPaymentUrl(localPayUrl);
        if (localBankSlip) setBankSlipUrl(localBankSlip);
        if (localIdent) setIdentificationField(localIdent);
        if (localPixQr) setPixQrCode(localPixQr);
        if (localPixCode) setPixCopiaECola(localPixCode);
        if (localPhone) setUserPhone(localPhone);
        if (localCpf) setUserCpf(localCpf);

        let activeCustId = localCustId;
        let activeSubId = localSubId;
        let activeUserId = '';
        let activeEmail = localEmail;

        const resolvedLocalPlan = resolvePlanDetails(localPlan);
        setPlanId(resolvedLocalPlan.id);
        setPlanName(resolvedLocalPlan.name);
        setPlanPrice(resolvedLocalPlan.price);
        setPaymentValue(resolvedLocalPlan.price);
        setPlanBillingCycle(resolvedLocalPlan.cycle);

        if (session) {
          activeUserId = session.user.id;
          setUserId(session.user.id);
          const email = session.user.email?.toLowerCase() || '';
          activeEmail = email;
          setUserEmail(email);

          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!isMounted) return;

          if (profile) {
            const fullName = profile.full_name || localName || email.split('@')[0];
            setUserName(fullName);
            setUserCpf(profile.cpf || localCpf || '');
            setUserPhone(profile.phone || localPhone || '');
            setCardHolderName(fullName);
            setCardHolderCpf(profile.cpf || localCpf || '');
            setCardHolderPhone(profile.phone || localPhone || '');

            const resolvedProfilePlan = resolvePlanDetails(profile.plan_id || profile.plan_name || localPlan, profile.plan_price);
            setPlanId(resolvedProfilePlan.id);
            setPlanName(profile.plan_name || resolvedProfilePlan.name);
            setPlanPrice(resolvedProfilePlan.price);
            setPaymentValue(resolvedProfilePlan.price);
            setPlanBillingCycle(resolvedProfilePlan.cycle);
            
            const realCustId = profile.asaas_customer_id || '';
            const realSubId = profile.subscription_id || profile.asaas_subscription_id || '';
            setCustomerId(realCustId);
            setSubscriptionId(realSubId);
            activeCustId = realCustId;
            activeSubId = realSubId;

            const isDbActive = profile.subscription_status === 'ACTIVE' || profile.subscription_status === 'CONFIRMED' || profile.subscription_status === 'RECEIVED';
            setHasActivePlan(isDbActive);
            setSubscriptionStatus(isDbActive ? 'ACTIVE' : (profile.subscription_status || 'PENDING_PAYMENT'));
          }
        } else {
          setUserName(localName || 'Tutor');
          setUserEmail(localEmail);
          setCardHolderName(localName || 'Tutor');
        }

        // Carrega faturas detalhadas do Asaas
        if (activeCustId || activeSubId || activeEmail) {
          void fetchInvoices(activeCustId, activeSubId, activeEmail, activeUserId);
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do plano:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [fetchInvoices]);

  // AUTO-POLLING INTELIGENTE: Enquanto o pagamento estiver pendente e na aba Pix, checa a cada 10 segundos
  useEffect(() => {
    if (hasActivePlan || activePaymentTab !== 'pix' || (!customerId && !subscriptionId && !userEmail)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const result = await verifyAndUnlockSubscription({
          customerId,
          subscriptionId,
          email: userEmail,
          userId,
        });

        if (result.success && (result.paid || result.status === 'ACTIVE')) {
          setHasActivePlan(true);
          setSubscriptionStatus('ACTIVE');
          setHasOverdue(false);
          setActionFeedback({
            type: 'success',
            message: '🎉 Pagamento identificado automaticamente! Seu acesso foi 100% liberado.',
          });
          void fetchInvoices();
        }
      } catch {
        // Silencioso no background
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [hasActivePlan, activePaymentTab, customerId, subscriptionId, userEmail, userId, fetchInvoices]);

  const handleDownloadQrCode = () => {
    if (!pixQrCode) return;
    const link = document.createElement('a');
    link.href = pixQrCode;
    link.download = `pix-qrcode-vetpro-${planId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para enviar os dados da fatura e Pix para o WhatsApp do Tutor
  const handleSendToWhatsapp = async (overrideParams?: {
    phone?: string;
    paymentId?: string;
    invoiceUrl?: string;
    pixCopiaECola?: string;
    isOverdue?: boolean;
    dueDate?: string;
    value?: number;
  }) => {
    const targetPhone = overrideParams?.phone || userPhone;
    const targetPaymentId = overrideParams?.paymentId || paymentId;
    const targetInvoiceUrl = overrideParams?.invoiceUrl || paymentUrl;
    const targetPix = overrideParams?.pixCopiaECola || pixCopiaECola;
    const isOverdueTarget = overrideParams?.isOverdue !== undefined ? overrideParams.isOverdue : hasOverdue;
    const targetDueDate = overrideParams?.dueDate || paymentDueDate;
    const targetValue = overrideParams?.value || paymentValue;

    if (!targetPhone) {
      setActionFeedback({ type: 'error', message: 'Por favor, informe seu número de WhatsApp com DDD.' });
      return;
    }

    setIsSendingWhatsapp(true);
    setWhatsappSentSuccess(null);

    try {
      const evoConfig = getEvolutionConfig();
      const res = await fetch('/api/asaas/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          name: userName,
          email: userEmail,
          planName,
          planPrice: targetValue,
          paymentId: targetPaymentId,
          invoiceNumber: targetPaymentId,
          invoiceUrl: targetInvoiceUrl,
          paymentUrl: targetInvoiceUrl,
          pixCopiaECola: targetPix,
          dueDate: targetDueDate,
          isOverdue: isOverdueTarget,
          serverUrl: evoConfig.serverUrl,
          apiKey: evoConfig.apiKey,
          instanceName: evoConfig.defaultInstance,
        }),
      });

      const data = await res.json();
      if (data.whatsappUrl) {
        setCustomWhatsappUrl(data.whatsappUrl);
      }

      if (data.sentViaEvolution || data.success) {
        setWhatsappSentSuccess(`✅ Fatura Asaas Nº ${targetPaymentId || ''} e Pix enviados com sucesso para o seu WhatsApp!`);
        setActionFeedback({ type: 'success', message: 'Mensagem enviada com sucesso para o seu WhatsApp!' });
      } else {
        setWhatsappSentSuccess(`📲 Link do WhatsApp pronto! Clique no botão "Abrir no WhatsApp" para enviar.`);
        setActionFeedback({
          type: 'info',
          message: 'Link do WhatsApp gerado. Clique em "Abrir no WhatsApp" para visualizar.',
        });
      }
    } catch {
      setWhatsappSentSuccess('Erro ao enviar mensagem para o WhatsApp.');
      setActionFeedback({ type: 'error', message: 'Falha na comunicação com o servidor.' });
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  // Pagar uma fatura específica da lista (ex: fatura em atraso)
  const handleSelectAndPayInvoice = (inv: AsaasPaymentItem) => {
    setPaymentId(inv.id);
    if (inv.invoiceUrl) setPaymentUrl(inv.invoiceUrl);
    if (inv.bankSlipUrl) setBankSlipUrl(inv.bankSlipUrl);
    if (inv.pixCopiaECola) setPixCopiaECola(inv.pixCopiaECola);
    if (inv.pixQrCode) setPixQrCode(inv.pixQrCode);
    if (inv.dueDate) setPaymentDueDate(inv.dueDate);
    if (inv.value) setPaymentValue(inv.value);

    setActivePaymentTab('pix');
    setActionFeedback({
      type: 'info',
      message: `⚡ Fatura ${inv.id} (R$ ${inv.value.toFixed(2)}) selecionada para pagamento. Escaneie o Pix ou copie a chave abaixo.`,
    });

    // Rola até o bloco de pagamento
    const el = document.getElementById('payment-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Abre o modal de confirmação para trocar de plano
  const handleOpenChangePlanModal = (targetPlan: typeof AVAILABLE_PLANS[0]) => {
    setTargetPlanToChange(targetPlan);
    setShowChangePlanModal(true);
  };

  // Executa a troca de plano no Asaas e Supabase
  const handleConfirmChangePlan = async () => {
    if (!targetPlanToChange) return;

    setIsChangingPlan(true);
    setActionFeedback(null);
    setWhatsappSentSuccess(null);

    try {
      const localAsaasConfig = getAsaasConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') || '' : '';

      const res = await fetch('/api/asaas/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          email: userEmail,
          customerId,
          currentSubscriptionId: subscriptionId,
          targetPlanId: targetPlanToChange.id,
          customPlanPrice: targetPlanToChange.price,
          customPlanName: targetPlanToChange.name,
          cpfCnpj: userCpf,
          name: userName,
          phone: userPhone,
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
        setPlanId(data.planId);
        setPlanName(data.planName);
        setPlanPrice(data.planPrice);
        setPaymentValue(data.planPrice);
        setPlanBillingCycle(data.billingCycle || targetPlanToChange.billingCycle);

        if (data.customerId) {
          setCustomerId(data.customerId);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_asaas_customer_id', data.customerId);
        }
        if (data.subscriptionId) {
          setSubscriptionId(data.subscriptionId);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_asaas_subscription_id', data.subscriptionId);
        }
        if (data.paymentId) {
          setPaymentId(data.paymentId);
        }
        if (data.paymentUrl || data.invoiceUrl) {
          const url = data.invoiceUrl || data.paymentUrl;
          setPaymentUrl(url);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_payment_url', url);
        }
        if (data.bankSlipUrl) {
          setBankSlipUrl(data.bankSlipUrl);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_bank_slip_url', data.bankSlipUrl);
        }
        if (data.identificationField) {
          setIdentificationField(data.identificationField);
        }
        if (data.pixQrCodeImage) {
          setPixQrCode(data.pixQrCodeImage);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_qrcode', data.pixQrCodeImage);
        }
        if (data.pixCopiaECola) {
          setPixCopiaECola(data.pixCopiaECola);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_pix_copia_cola', data.pixCopiaECola);
        }
        if (data.dueDate) {
          setPaymentDueDate(data.dueDate);
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('vetpro_selected_plan', data.planId);
        }

        setShowChangePlanModal(false);
        setActionFeedback({
          type: 'success',
          message: `🎉 Plano alterado com sucesso para ${data.planName}! Sua nova fatura no valor de R$ ${data.planPrice.toFixed(2).replace('.', ',')} foi gerada.`,
        });

        // Recarrega faturas
        void fetchInvoices(data.customerId || customerId);

        // Rola até o bloco de pagamento
        setTimeout(() => {
          const el = document.getElementById('payment-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Não foi possível alterar o plano no Asaas.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro de conexão ao alterar plano.',
      });
    } finally {
      setIsChangingPlan(false);
    }
  };

  // Função para GERAR FATURA DA ASSINATURA no Asaas
  const handleGenerateInvoice = async (targetPlanId?: string, targetPlanPrice?: number, overrideCpf?: string, overrideName?: string, overridePhone?: string) => {
    const activeCpf = overrideCpf || userCpf;
    const activeName = overrideName || userName;
    const activePhone = overridePhone || userPhone;

    if (!customerId && (!activeCpf || activeCpf.replace(/\D/g, '').length < 11)) {
      setTempCpf(activeCpf || '');
      setTempName(activeName || '');
      setTempPhone(activePhone || '');
      setShowCpfModal(true);
      return;
    }

    setIsGeneratingInvoice(true);
    setActionFeedback(null);
    setWhatsappSentSuccess(null);

    const selectedPlan = targetPlanId || planId;
    const resolved = resolvePlanDetails(selectedPlan, targetPlanPrice);
    const selectedPrice = resolved.price;
    const selectedName = resolved.name;

    try {
      const localAsaasConfig = getAsaasConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') || '' : '';

      const res = await fetch('/api/asaas/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          userId,
          email: userEmail,
          name: activeName || (userEmail ? userEmail.split('@')[0] : 'Tutor VetPro'),
          cpfCnpj: activeCpf,
          phone: activePhone,
          planId: resolved.id,
          planName: selectedName,
          planPrice: selectedPrice,
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
        if (data.customerId) {
          setCustomerId(data.customerId);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_asaas_customer_id', data.customerId);
        }
        if (data.subscriptionId) {
          setSubscriptionId(data.subscriptionId);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_asaas_subscription_id', data.subscriptionId);
        }
        if (data.paymentId) {
          setPaymentId(data.paymentId);
        }
        if (data.paymentUrl || data.invoiceUrl) {
          const url = data.invoiceUrl || data.paymentUrl;
          setPaymentUrl(url);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_payment_url', url);
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
        if (data.dueDate) {
          setPaymentDueDate(data.dueDate);
        }
        if (data.value) {
          setPaymentValue(data.value);
        }
        if (data.whatsappUrl) {
          setCustomWhatsappUrl(data.whatsappUrl);
        }

        if (targetPlanId) {
          setPlanId(resolved.id);
          setPlanName(selectedName);
          setPlanPrice(selectedPrice);
          setPlanBillingCycle(resolved.cycle);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_selected_plan', resolved.id);
        }

        setShowCpfModal(false);
        setActionFeedback({
          type: 'success',
          message: '⚡ Fatura e QR Code Pix gerados com sucesso no Asaas! Você já pode escanear ou copiar a chave.',
        });

        // Recarrega lista completa de faturas
        void fetchInvoices(data.customerId || customerId);
      } else {
        if (data.error && (data.error.includes('CPF') || data.error.includes('cpf'))) {
          setShowCpfModal(true);
        }
        setActionFeedback({
          type: 'error',
          message: data.error || 'Não foi possível gerar a fatura no Asaas.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro de conexão ao gerar fatura.',
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  // Função para PAGAR COM CARTÃO DE CRÉDITO DIRETO NO APP
  const handlePayWithCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingCard(true);
    setActionFeedback(null);

    const cleanCard = cardNumber.replace(/\D/g, '');
    const cleanCvv = cardCcv.replace(/\D/g, '');
    const cleanCpf = (cardHolderCpf || userCpf).replace(/\D/g, '');

    if (!cleanCard || cleanCard.length < 13) {
      setActionFeedback({ type: 'error', message: 'Por favor, digite um número de cartão de crédito válido.' });
      setIsProcessingCard(false);
      return;
    }

    if (!cardHolderName.trim()) {
      setActionFeedback({ type: 'error', message: 'Digite o nome impresso no cartão.' });
      setIsProcessingCard(false);
      return;
    }

    if (!cardExpiryMonth || !cardExpiryYear) {
      setActionFeedback({ type: 'error', message: 'Informe o mês e o ano de validade do cartão.' });
      setIsProcessingCard(false);
      return;
    }

    if (!cleanCvv || cleanCvv.length < 3) {
      setActionFeedback({ type: 'error', message: 'Digite o código de segurança (CVV) do cartão.' });
      setIsProcessingCard(false);
      return;
    }

    try {
      const localAsaasConfig = getAsaasConfig();
      const res = await fetch('/api/asaas/pay-with-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          paymentId,
          userId,
          email: userEmail,
          name: userName,
          planId,
          planName,
          planPrice,
          creditCard: {
            holderName: cardHolderName,
            number: cleanCard,
            expiryMonth: cardExpiryMonth,
            expiryYear: cardExpiryYear.length === 2 ? `20${cardExpiryYear}` : cardExpiryYear,
            ccv: cleanCvv,
          },
          creditCardHolderInfo: {
            name: cardHolderName,
            email: userEmail,
            cpfCnpj: cleanCpf,
            postalCode: cardHolderPostalCode.replace(/\D/g, '') || '01310100',
            addressNumber: cardHolderAddressNumber || '100',
            phone: (cardHolderPhone || userPhone).replace(/\D/g, '') || '11999999999',
          },
          asaasConfig: {
            apiKey: localAsaasConfig.apiKey,
            environment: localAsaasConfig.environment,
            customBaseUrl: localAsaasConfig.customBaseUrl,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setHasActivePlan(true);
        setSubscriptionStatus('ACTIVE');
        setHasOverdue(false);
        setActionFeedback({
          type: 'success',
          message: '🎉 Pagamento com cartão aprovado com sucesso! Acesso 100% liberado.',
        });
        void fetchInvoices();
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Não foi possível processar o pagamento com cartão.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro de conexão ao processar cartão.',
      });
    } finally {
      setIsProcessingCard(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixCopiaECola) return;
    navigator.clipboard.writeText(pixCopiaECola);
    setIsCopiedPix(true);
    setTimeout(() => setIsCopiedPix(false), 3000);
  };

  const handleCopyBoleto = () => {
    if (!identificationField) return;
    navigator.clipboard.writeText(identificationField);
    setIsCopiedBoleto(true);
    setTimeout(() => setIsCopiedBoleto(false), 3000);
  };

  const handleVerifyPayment = async () => {
    setIsCheckingPayment(true);
    setActionFeedback(null);

    try {
      const result = await verifyAndUnlockSubscription({
        customerId,
        subscriptionId,
        email: userEmail,
        userId,
      });

      if (result.success && (result.paid || result.status === 'ACTIVE')) {
        setHasActivePlan(true);
        setSubscriptionStatus('ACTIVE');
        setHasOverdue(false);
        setActionFeedback({
          type: 'success',
          message: '🎉 Pagamento confirmado no Asaas! Seu acesso está totalmente liberado.',
        });
        void fetchInvoices();
      } else {
        setActionFeedback({
          type: 'info',
          message: 'Ainda aguardando a compensação do pagamento pelo Asaas. Se você já pagou via Pix, a confirmação ocorre em instantes.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro ao verificar pagamento.',
      });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    if (invoiceFilter === 'overdue') return invoices.filter((i) => i.isOverdue);
    if (invoiceFilter === 'pending') return invoices.filter((i) => !i.isPaid && !i.isOverdue);
    if (invoiceFilter === 'paid') return invoices.filter((i) => i.isPaid);
    return invoices;
  }, [invoices, invoiceFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-brand-teal animate-spin" />
        <p className="text-sm font-medium text-brand-text-muted">Carregando dados da assinatura...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-brand-text tracking-tight">
            Minha Assinatura & Faturas
          </h1>
          <p className="text-xs md:text-sm text-brand-text-muted mt-1">
            Gerencie seu plano VetPro Orienta, faturas Asaas e pagamentos instantâneos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchInvoices()}
            disabled={isLoadingInvoices}
            className="px-3 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin text-brand-teal' : ''}`} />
            <span>Atualizar Faturas</span>
          </button>
        </div>
      </div>

      {/* BANNER DE FATURAS EM ATRASO (OVERDUE) - Requisito do Tutor */}
      {hasOverdue && overdueInvoices.length > 0 && (
        <div className="p-5 md:p-6 rounded-3xl bg-rose-500/10 border-2 border-rose-500/40 text-rose-300 space-y-4 shadow-xl animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-display font-bold text-base md:text-lg text-rose-200">
                  Atenção: Você possui {overdueCount} fatura{overdueCount > 1 ? 's' : ''} em atraso
                </h3>
                <p className="text-xs text-rose-300/90 mt-0.5">
                  Valor total em atraso: <strong className="text-white font-mono">R$ {overdueTotal.toFixed(2).replace('.', ',')}</strong>. Regularize para manter seu acesso sem interrupções.
                </p>
              </div>
            </div>

            {/* Ações Rápidas da Fatura em Atraso */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectAndPayInvoice(overdueInvoices[0])}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                <QrCode className="w-3.5 h-3.5" />
                Pagar com Pix Agora
              </button>
              
              <button
                type="button"
                onClick={() => handleSendToWhatsapp({
                  phone: userPhone,
                  paymentId: overdueInvoices[0].id,
                  invoiceUrl: overdueInvoices[0].invoiceUrl,
                  pixCopiaECola: overdueInvoices[0].pixCopiaECola,
                  isOverdue: true,
                  dueDate: overdueInvoices[0].dueDate,
                  value: overdueInvoices[0].value,
                })}
                disabled={isSendingWhatsapp}
                className="px-4 py-2.5 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Send className={`w-3.5 h-3.5 ${isSendingWhatsapp ? 'animate-spin' : ''}`} />
                {isSendingWhatsapp ? 'Enviando...' : 'Receber Cobrança no WhatsApp'}
              </button>

              {overdueInvoices[0].invoiceUrl && (
                <a
                  href={overdueInvoices[0].invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-white font-semibold text-xs flex items-center gap-1 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir no Asaas
                </a>
              )}
            </div>
          </div>

          {/* Mini Lista das Faturas em Atraso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {overdueInvoices.map((inv) => (
              <div key={inv.id} className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-rose-200 block">{inv.id}</span>
                  <span className="text-[11px] text-rose-300/80">
                    Venceu em: {inv.dueDate ? new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold font-mono text-white block">R$ {inv.value.toFixed(2).replace('.', ',')}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAndPayInvoice(inv)}
                    className="text-[11px] text-rose-300 underline font-semibold hover:text-white mt-0.5"
                  >
                    Pagar esta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback de Ação */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border text-xs md:text-sm font-medium flex items-center gap-3 animate-in fade-in ${
          actionFeedback.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : actionFeedback.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              : 'bg-brand-surface-2 border-brand-border-strong text-brand-text'
        }`}>
          {actionFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : actionFeedback.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <Sparkles className="w-5 h-5 text-brand-teal shrink-0" />
          )}
          <div className="flex-1">{actionFeedback.message}</div>
        </div>
      )}

      {/* Notificação de Envio do WhatsApp */}
      {whatsappSentSuccess && (
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs md:text-sm font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-5 h-5 shrink-0" />
            <span>{whatsappSentSuccess}</span>
          </div>
          {directWhatsappUrl && (
            <a
              href={directWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0"
            >
              <Smartphone className="w-3.5 h-3.5" /> Abrir no WhatsApp <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Card do Plano Atual e Status */}
      <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-brand-border-strong">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-text-muted">
                Plano Atual
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                hasActivePlan 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : hasOverdue
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {hasActivePlan ? <CheckCircle2 className="w-3.5 h-3.5" /> : hasOverdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {hasActivePlan ? 'Assinatura Ativa & Liberada' : hasOverdue ? 'Fatura em Atraso' : 'Aguardando Pagamento'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-text">
              VetPro <span className="text-brand-teal">{planName}</span>
            </h2>
            <p className="text-xs md:text-sm text-brand-text-muted">
              {hasActivePlan 
                ? `Sua assinatura ${planBillingCycle === 'YEARLY' ? 'anual' : 'mensal'} está em dia. Você tem acesso completo a todas as funcionalidades do plano em todo o sistema.` 
                : 'Efetue o pagamento abaixo por Pix, Cartão ou Boleto. Assim que confirmado, todas as telas do sistema são liberadas de uma só vez.'}
            </p>
          </div>

          <div className="bg-brand-surface-2 p-5 rounded-2xl border border-brand-border-strong text-right shrink-0 min-w-[210px]">
            <span className="text-[11px] font-semibold text-brand-text-muted uppercase tracking-wider block mb-1">
              Valor da Assinatura
            </span>
            <div className="text-3xl font-display font-bold text-brand-text">
              R$ {planPrice.toFixed(2).replace('.', ',')}
              <span className="text-xs text-brand-text-muted font-normal">{planBillingCycle === 'YEARLY' ? '/ano' : '/mês'}</span>
            </div>
            <div className="text-[11px] text-brand-teal font-medium mt-1">
              {planBillingCycle === 'YEARLY' ? 'Equivale a R$ 4,99/mês (Economia 50%)' : 'Ciclo: Mensal (Asaas)'}
            </div>
          </div>
        </div>

        {/* Dados Técnicos */}
        <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-brand-surface-2/60 rounded-xl border border-brand-border">
            <span className="text-brand-text-muted block text-[10px] uppercase font-semibold">Cliente Asaas</span>
            <span className="font-mono font-medium text-brand-text truncate block mt-0.5">
              {customerId || 'Será criado no pagamento'}
            </span>
          </div>

          <div className="p-3 bg-brand-surface-2/60 rounded-xl border border-brand-border">
            <span className="text-brand-text-muted block text-[10px] uppercase font-semibold">ID Assinatura</span>
            <span className="font-mono font-medium text-brand-text truncate block mt-0.5">
              {subscriptionId || 'Será gerado na emissão'}
            </span>
          </div>

          <div className="p-3 bg-brand-surface-2/60 rounded-xl border border-brand-border">
            <span className="text-brand-text-muted block text-[10px] uppercase font-semibold">Status Gateway</span>
            <span className={`font-semibold capitalize block mt-0.5 ${hasOverdue ? 'text-rose-400' : 'text-brand-teal'}`}>
              {hasOverdue ? 'OVERDUE (Em Atraso)' : subscriptionStatus}
            </span>
          </div>

          <div className="p-3 bg-brand-surface-2/60 rounded-xl border border-brand-border">
            <span className="text-brand-text-muted block text-[10px] uppercase font-semibold">Vencimento da Fatura</span>
            <span className="font-semibold text-brand-text block mt-0.5">
              {paymentDueDate ? new Date(paymentDueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Imediato / 1 dia'}
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO DE TROCA DE PLANO / UPGRADE / DOWNGRADE */}
      <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-border-strong">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Planos & Upgrade
            </div>
            <h3 className="text-xl md:text-2xl font-display font-bold text-brand-text">
              Alterar ou Fazer Upgrade do seu Plano
            </h3>
            <p className="text-xs md:text-sm text-brand-text-muted mt-1">
              Troque seu plano a qualquer momento. Ao mudar, sua assinatura anterior é substituída com segurança no Asaas.
            </p>
          </div>
        </div>

        {/* Grid de Cards de Planos para Troca / Upgrade */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AVAILABLE_PLANS.map((plan) => {
            const isCurrent = planId === plan.id || 
              (plan.id === 'essencial' && (planId === 'essencial' || planName.toLowerCase().includes('essencial') && !planName.toLowerCase().includes('anual') && planPrice < 20)) ||
              (plan.id === 'anual-promocional' && (planId === 'anual-promocional' || planId === 'anual' || planName.toLowerCase().includes('anual') || (planPrice > 50 && planPrice < 70))) ||
              (plan.id === 'especialista' && (planId === 'especialista' || planName.toLowerCase().includes('especialista')));

            const isUpgrade = !isCurrent && !plan.isInactive && (
              (plan.id === 'anual-promocional' && (planId === 'essencial' || planPrice < 20))
            );

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'bg-brand-teal/10 border-brand-teal shadow-lg ring-2 ring-brand-teal/40'
                    : plan.isInactive
                      ? 'bg-brand-surface/70 border-amber-500/30 shadow-sm opacity-90'
                      : plan.isPopular
                        ? 'bg-gradient-to-b from-brand-surface to-brand-surface-2 border-brand-accent/60 shadow-md ring-1 ring-brand-accent/20'
                        : 'bg-brand-surface-2 border-brand-border-strong hover:border-brand-border'
                }`}
              >
                {/* Badges de Destaque */}
                <div className="absolute -top-3 right-4 flex items-center gap-1.5">
                  {isCurrent && (
                    <span className="bg-brand-teal text-brand-bg text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Check className="w-3 h-3" /> Plano Atual
                    </span>
                  )}
                  {plan.isInactive && (
                    <span className="bg-amber-500 text-brand-bg text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Clock className="w-3 h-3" /> EM BREVE
                    </span>
                  )}
                  {plan.isPopular && !isCurrent && !plan.isInactive && (
                    <span className="bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink text-[10.5px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Mais Vendido
                    </span>
                  )}
                </div>

                <div>
                  <div className="mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider block ${plan.isInactive ? 'text-amber-400' : 'text-brand-teal'}`}>
                      {plan.badge}
                    </span>
                    <h4 className="font-display text-xl font-bold text-brand-text">
                      {plan.name}
                    </h4>
                  </div>

                  <p className="text-xs text-brand-text-muted mb-4 leading-relaxed">
                    {plan.desc}
                  </p>

                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-xs font-semibold text-brand-text-muted">R$</span>
                    <span className="font-display text-3xl font-extrabold text-brand-text tracking-tight">
                      {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-brand-text-muted">{plan.period}</span>
                  </div>

                  <div className={`text-[11px] font-medium mb-5 pb-3 border-b border-brand-border-strong ${plan.isInactive ? 'text-amber-400/80' : 'text-brand-teal'}`}>
                    {plan.billingDesc}
                  </div>

                  {/* Lista de Recursos */}
                  <ul className="space-y-2.5 mb-6 text-xs text-brand-text">
                    {plan.features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        {plan.isInactive ? (
                          <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 mt-0.5">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                          </div>
                        ) : (
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isCurrent ? 'text-brand-teal' : 'text-brand-text-muted'}`} />
                        )}
                        <span className="leading-tight">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botão de Ação */}
                <div>
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl font-display font-bold text-xs bg-brand-teal/20 text-brand-teal border border-brand-teal/40 flex items-center justify-center gap-1.5 cursor-default">
                      <Check className="w-3.5 h-3.5" />
                      <span>Plano Atual Contratado</span>
                    </div>
                  ) : plan.isInactive ? (
                    <button
                      type="button"
                      disabled
                      className="w-full py-3 rounded-xl font-display font-bold text-xs bg-brand-surface-2 border border-amber-500/30 text-amber-300/80 cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>EM BREVE — Indisponível no Momento</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenChangePlanModal(plan)}
                      disabled={isChangingPlan}
                      className={`w-full py-3 rounded-xl font-display font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                        isUpgrade
                          ? 'bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink hover:opacity-95 shadow-brand-accent/20'
                          : 'bg-brand-surface hover:bg-brand-surface-2 text-brand-text border border-brand-border-strong hover:border-brand-teal'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {isUpgrade 
                          ? 'Fazer Upgrade para Anual (Economize 50%)'
                          : `Mudar para ${plan.name}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bloco de Opções de Pagamento: PIX | CARTÃO DE CRÉDITO | BOLETO */}
      <div id="payment-section" className="bg-brand-surface border-2 border-brand-teal/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-brand-border-strong">
          <div>
            <h3 className="text-lg md:text-xl font-display font-bold text-brand-text flex items-center gap-2">
              <Wallet className="w-5 h-5 text-brand-teal" />
              Escolha Como Pagar
            </h3>
            <p className="text-xs text-brand-text-muted mt-0.5">
              Selecione sua forma preferida: Pix Instantâneo, Cartão de Crédito ou Boleto Bancário.
            </p>
          </div>

          {/* Seletor de Abas de Pagamento */}
          <div className="flex items-center p-1 bg-brand-surface-2 rounded-2xl border border-brand-border-strong">
            <button
              type="button"
              onClick={() => setActivePaymentTab('pix')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activePaymentTab === 'pix'
                  ? 'bg-brand-teal text-brand-bg shadow-sm'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <QrCode className="w-4 h-4" />
              Pix (Instantâneo)
            </button>

            <button
              type="button"
              onClick={() => setActivePaymentTab('card')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activePaymentTab === 'card'
                  ? 'bg-brand-teal text-brand-bg shadow-sm'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Cartão de Crédito
            </button>

            <button
              type="button"
              onClick={() => setActivePaymentTab('boleto')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activePaymentTab === 'boleto'
                  ? 'bg-brand-teal text-brand-bg shadow-sm'
                  : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              <FileText className="w-4 h-4" />
              Boleto Bancário
            </button>
          </div>
        </div>

        {/* ABA 1: PIX INSTANTÂNEO */}
        {activePaymentTab === 'pix' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center animate-fadeIn">
            {/* QR Code Pix */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-brand-surface-2 rounded-2xl border-2 border-brand-teal/30 text-center shadow-inner">
              {pixQrCode ? (
                <div className="flex flex-col items-center">
                  <div className="relative p-4 bg-white rounded-2xl shadow-xl border-2 border-gray-200 mb-3 group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={pixQrCode} 
                      alt="QR Code Pix" 
                      className="w-48 h-48 md:w-56 md:h-56 object-contain image-rendering-pixelated" 
                    />
                    <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-brand-teal" />
                    <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-brand-teal" />
                    <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-brand-teal" />
                    <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-brand-teal" />
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={handleDownloadQrCode}
                      className="px-3 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-surface-2 border border-brand-border-strong text-brand-text font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5 text-brand-teal" />
                      Baixar Imagem
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateInvoice()}
                      disabled={isGeneratingInvoice}
                      className="px-3 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-surface-2 border border-brand-border-strong text-brand-text font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-brand-teal ${isGeneratingInvoice ? 'animate-spin' : ''}`} />
                      Atualizar Pix
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full py-8 px-4 rounded-2xl bg-brand-surface border-2 border-dashed border-brand-teal/40 flex flex-col items-center justify-center text-center mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-brand-teal/10 flex items-center justify-center mb-3 text-brand-teal">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-brand-text mb-1">
                    QR Code Pix Pronto para Gerar
                  </h4>
                  <p className="text-xs text-brand-text-muted mb-4 max-w-xs">
                    Clique no botão abaixo para gerar sua fatura e carregar o QR Code escaneável imediatamente:
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateInvoice()}
                    disabled={isGeneratingInvoice}
                    className="px-5 py-3 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
                  >
                    <Zap className={`w-4 h-4 ${isGeneratingInvoice ? 'animate-spin' : ''}`} />
                    {isGeneratingInvoice ? 'Gerando QR Code...' : '⚡ Gerar QR Code Pix Agora'}
                  </button>
                </div>
              )}

              <div className="mt-2 space-y-1">
                <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Pagamento com Compensação Imediata
                </span>
                <span className="text-xs text-brand-text font-medium block">
                  Valor da Assinatura: <strong className="text-brand-teal">R$ {paymentValue.toFixed(2).replace('.', ',')}</strong>/mês
                </span>
                {paymentId && (
                  <span className="text-[11px] font-mono text-brand-text-muted block">
                    Fatura Asaas Nº: <code>{paymentId}</code>
                  </span>
                )}
                {!hasActivePlan && (
                  <span className="text-[10.5px] text-brand-teal font-medium flex items-center justify-center gap-1 pt-1 animate-pulse">
                    <Clock className="w-3 h-3" /> Monitorando pagamento em tempo real...
                  </span>
                )}
              </div>
            </div>

            {/* Chave Pix e Ações */}
            <div className="lg:col-span-7 space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-brand-text block">
                    Código Pix Copia e Cola:
                  </label>
                  {pixCopiaECola && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Chave pronta para copiar
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixCopiaECola || 'Clique em "Gerar QR Code Pix Agora" para obter o código'}
                    className="w-full bg-brand-surface-2 border-2 border-brand-border-strong focus:border-brand-teal rounded-xl px-3.5 py-3 text-xs font-mono text-brand-text focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    disabled={!pixCopiaECola}
                    className={`shrink-0 px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                      isCopiedPix
                        ? 'bg-emerald-500 text-brand-bg scale-105'
                        : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90 disabled:opacity-40 disabled:hover:bg-brand-teal'
                    }`}
                  >
                    {isCopiedPix ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopiedPix ? 'Copiado!' : 'Copiar Código'}
                  </button>
                </div>
                <p className="text-xs text-brand-text-muted leading-relaxed">
                  💡 <strong>Como pagar:</strong> Abra o aplicativo do seu banco no celular, acesse a área <strong>Pix &gt; Pix Copia e Cola</strong> (ou aponte a câmera para o QR Code) e confirme o valor de <strong>R$ {paymentValue.toFixed(2).replace('.', ',')}</strong>.
                </p>
              </div>

              {/* Integração com WhatsApp - Envio da Fatura com Número e Link Asaas */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" /> Receber Fatura & Pix no WhatsApp
                  </span>
                  <span className="text-[10.5px] text-brand-text-muted">
                    {userPhone ? `Telefone: ${userPhone}` : 'Cadastre seu número'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSendToWhatsapp()}
                    disabled={isSendingWhatsapp || !pixCopiaECola}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 ${isSendingWhatsapp ? 'animate-spin' : ''}`} />
                    {isSendingWhatsapp ? 'Enviando...' : '📲 Enviar Fatura para meu WhatsApp'}
                  </button>

                  {directWhatsappUrl && (
                    <a
                      href={directWhatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 rounded-xl bg-brand-surface hover:bg-brand-surface-2 border border-brand-border-strong text-brand-text font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      Abrir no WhatsApp <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Ações Rápidas & Verificação Única */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleVerifyPayment}
                  disabled={isCheckingPayment}
                  className="flex-1 py-3.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  <RefreshCw className={`w-4 h-4 ${isCheckingPayment ? 'animate-spin' : ''}`} />
                  {isCheckingPayment ? 'Verificando no Asaas...' : '✅ Já Paguei! Verificar e Desbloquear Tudo'}
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateInvoice()}
                  disabled={isGeneratingInvoice}
                  className="py-3.5 px-4 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Zap className={`w-4 h-4 text-brand-teal ${isGeneratingInvoice ? 'animate-spin' : ''}`} />
                  {isGeneratingInvoice ? 'Reemitindo...' : 'Reemitir Fatura'}
                </button>

                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3.5 px-4 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-teal" />
                    Checkout Asaas
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: CARTÃO DE CRÉDITO */}
        {activePaymentTab === 'card' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="p-4 bg-brand-surface-2/70 rounded-2xl border border-brand-border flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-xs text-brand-text">
                Ambiente seguro com criptografia de ponta a ponta processado via <strong>Asaas Pagamentos</strong>. Os dados do seu cartão nunca são salvos em nosso banco de dados.
              </p>
            </div>

            <form onSubmit={handlePayWithCreditCard} className="space-y-4 max-w-2xl mx-auto">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-text">Número do Cartão de Crédito</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                  <input
                    type="text"
                    required
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-brand-text">Nome Impresso no Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: JOAO S SILVA"
                  value={cardHolderName}
                  onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs text-brand-text focus:outline-none focus:border-brand-teal uppercase"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-text">Mês (MM)</label>
                  <input
                    type="text"
                    required
                    placeholder="12"
                    maxLength={2}
                    value={cardExpiryMonth}
                    onChange={(e) => setCardExpiryMonth(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs font-mono text-center text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-text">Ano (AA)</label>
                  <input
                    type="text"
                    required
                    placeholder="28"
                    maxLength={4}
                    value={cardExpiryYear}
                    onChange={(e) => setCardExpiryYear(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs font-mono text-center text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-text">CVV</label>
                  <input
                    type="password"
                    required
                    placeholder="123"
                    maxLength={4}
                    value={cardCcv}
                    onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs font-mono text-center text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-text">CPF do Titular</label>
                  <input
                    type="text"
                    required
                    placeholder="000.000.000-00"
                    value={cardHolderCpf}
                    onChange={(e) => setCardHolderCpf(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-brand-text">CEP de Cobrança</label>
                  <input
                    type="text"
                    placeholder="00000-000"
                    value={cardHolderPostalCode}
                    onChange={(e) => setCardHolderPostalCode(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-surface-2 border border-brand-border-strong rounded-xl text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isProcessingCard}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CreditCard className={`w-4 h-4 ${isProcessingCard ? 'animate-spin' : ''}`} />
                  {isProcessingCard ? 'Processando Pagamento...' : `Confirmar Assinatura (R$ ${paymentValue.toFixed(2).replace('.', ',')}/mês)`}
                </button>

                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3.5 px-4 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-brand-teal" />
                    Pagar no Checkout Online
                  </a>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ABA 3: BOLETO BANCÁRIO */}
        {activePaymentTab === 'boleto' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="p-4 bg-brand-surface-2/70 rounded-2xl border border-brand-border flex items-start gap-3">
              <FileText className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-brand-text space-y-1">
                <p className="font-semibold">Informações sobre o Boleto Bancário:</p>
                <p className="text-brand-text-muted">
                  O boleto pode ser pago em qualquer banco ou casa lotérica até a data de vencimento. A compensação bancária costuma levar de 1 a 2 dias úteis.
                </p>
              </div>
            </div>

            {/* Linha Digitável do Boleto */}
            {identificationField ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-brand-text block">
                  Linha Digitável / Código de Barras:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={identificationField}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-3 text-xs font-mono text-brand-text focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyBoleto}
                    className={`shrink-0 px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                      isCopiedBoleto
                        ? 'bg-emerald-500 text-brand-bg'
                        : 'bg-brand-teal text-brand-bg hover:bg-brand-teal/90'
                    }`}
                  >
                    {isCopiedBoleto ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {isCopiedBoleto ? 'Copiado!' : 'Copiar Código'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {bankSlipUrl ? (
                <a
                  href={bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Download className="w-4 h-4" />
                  Visualizar / Baixar Boleto em PDF <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : paymentUrl ? (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3.5 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <FileText className="w-4 h-4" />
                  Abrir Fatura do Boleto no Asaas <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerateInvoice()}
                  disabled={isGeneratingInvoice}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  Gerar Boleto Bancário no Asaas
                </button>
              )}

              <button
                type="button"
                onClick={handleVerifyPayment}
                disabled={isCheckingPayment}
                className="py-3.5 px-5 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:bg-brand-surface text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingPayment ? 'animate-spin text-brand-teal' : ''}`} />
                {isCheckingPayment ? 'Verificando...' : 'Verificar Compensação'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Histórico Completo de Faturas do Asaas com Destaque para Faturas em Atraso */}
      <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 md:p-8 space-y-5 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-display font-bold text-brand-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-teal" />
              Histórico & Status das Faturas no Asaas
            </h3>
            <p className="text-xs text-brand-text-muted mt-0.5">
              Visualize faturas pagas, pendentes e em atraso, com acesso ao link do Asaas e envio no WhatsApp.
            </p>
          </div>

          {/* Filtros de Faturas */}
          <div className="flex items-center gap-1.5 p-1 bg-brand-surface-2 rounded-xl border border-brand-border-strong text-xs">
            <button
              type="button"
              onClick={() => setInvoiceFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                invoiceFilter === 'all' ? 'bg-brand-teal text-brand-bg' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Todas ({invoices.length})
            </button>
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => setInvoiceFilter('overdue')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  invoiceFilter === 'overdue' ? 'bg-rose-500 text-white' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Em Atraso ({overdueCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setInvoiceFilter('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                invoiceFilter === 'pending' ? 'bg-amber-500 text-brand-bg' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Pendentes
            </button>
            <button
              type="button"
              onClick={() => setInvoiceFilter('paid')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                invoiceFilter === 'paid' ? 'bg-emerald-500 text-brand-bg' : 'text-brand-text-muted hover:text-brand-text'
              }`}
            >
              Pagas
            </button>
          </div>
        </div>

        {isLoadingInvoices ? (
          <div className="py-8 text-center text-xs text-brand-text-muted flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-brand-teal animate-spin" />
            Carregando faturas atualizadas do Asaas...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-8 text-center bg-brand-surface-2/40 rounded-2xl border border-dashed border-brand-border text-xs text-brand-text-muted">
            Nenhuma cobrança encontrada para este filtro.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-brand-text-muted border-b border-brand-border-strong pb-2">
                  <th className="py-2.5 font-semibold">Fatura Asaas</th>
                  <th className="py-2.5 font-semibold">Vencimento</th>
                  <th className="py-2.5 font-semibold">Valor</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {filteredInvoices.map((inv) => (
                  <tr 
                    key={inv.id} 
                    className={`transition-colors ${
                      inv.isOverdue 
                        ? 'bg-rose-500/5 hover:bg-rose-500/10' 
                        : 'hover:bg-brand-surface-2/40'
                    }`}
                  >
                    <td className="py-3 font-mono font-medium text-brand-text">
                      <div className="flex items-center gap-1.5">
                        {inv.isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                        <span>{inv.id}</span>
                      </div>
                    </td>
                    <td className="py-3 text-brand-text-muted">
                      {inv.dueDate ? new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 font-bold text-brand-text font-mono">
                      R$ {Number(inv.value).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        inv.isPaid
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : inv.isOverdue
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {inv.isPaid ? 'PAGO' : inv.isOverdue ? 'EM ATRASO' : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Botão Pagar Pix se não pago */}
                        {!inv.isPaid && (
                          <button
                            type="button"
                            onClick={() => handleSelectAndPayInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-brand-teal text-brand-bg font-bold text-[11px] hover:bg-brand-teal/90 flex items-center gap-1 transition-all shadow-sm"
                            title="Pagar via Pix agora"
                          >
                            <QrCode className="w-3 h-3" />
                            Pagar Pix
                          </button>
                        )}

                        {/* Botão Enviar WhatsApp da Fatura */}
                        <button
                          type="button"
                          onClick={() => handleSendToWhatsapp({
                            phone: userPhone,
                            paymentId: inv.id,
                            invoiceUrl: inv.invoiceUrl,
                            pixCopiaECola: inv.pixCopiaECola,
                            isOverdue: inv.isOverdue,
                            dueDate: inv.dueDate,
                            value: inv.value,
                          })}
                          disabled={isSendingWhatsapp}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-[11px] font-semibold flex items-center gap-1 transition-all"
                          title="Enviar fatura para o WhatsApp"
                        >
                          <MessageCircle className="w-3 h-3" />
                          WhatsApp
                        </button>

                        {/* Link Fatura Asaas */}
                        {inv.invoiceUrl && (
                          <a
                            href={inv.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted hover:text-brand-text transition-all"
                            title="Abrir checkout da fatura no Asaas"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Boleto PDF */}
                        {inv.bankSlipUrl && (
                          <a
                            href={inv.bankSlipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg bg-brand-surface-2 border border-brand-border-strong text-amber-400 hover:text-amber-300 transition-all"
                            title="Baixar Boleto PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Troca de Plano / Upgrade */}
      {showChangePlanModal && targetPlanToChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-brand-surface border border-brand-teal/40 rounded-3xl p-6 md:p-8 w-full max-w-lg space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border-strong">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-display font-bold text-lg text-brand-text">
                  Confirmar Alteração de Plano
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChangePlanModal(false)}
                disabled={isChangingPlan}
                className="p-1 text-brand-text-muted hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comparativo Visual De -> Para */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-brand-surface-2 rounded-2xl border border-brand-border-strong">
              <div className="space-y-1">
                <span className="text-[10.5px] uppercase font-bold text-brand-text-muted">Plano Atual</span>
                <p className="font-bold text-sm text-brand-text">{planName}</p>
                <p className="text-xs text-brand-text-muted font-mono">
                  R$ {planPrice.toFixed(2).replace('.', ',')}{planBillingCycle === 'YEARLY' ? '/ano' : '/mês'}
                </p>
              </div>

              <div className="space-y-1 border-l border-brand-border pl-3">
                <span className="text-[10.5px] uppercase font-bold text-brand-teal">Novo Plano Escolhido</span>
                <p className="font-bold text-sm text-brand-teal">{targetPlanToChange.name}</p>
                <p className="text-xs text-brand-teal font-mono font-bold">
                  R$ {targetPlanToChange.price.toFixed(2).replace('.', ',')}{targetPlanToChange.period}
                </p>
              </div>
            </div>

            {/* Explicação de como funciona no Asaas */}
            <div className="space-y-2 text-xs text-brand-text-muted">
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                <span>
                  Sua assinatura anterior será cancelada no gateway Asaas e substituída imediatamente pelo <strong>{targetPlanToChange.name}</strong>.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                <span>
                  Uma nova fatura no valor de <strong>R$ {targetPlanToChange.price.toFixed(2).replace('.', ',')}</strong> ({targetPlanToChange.period.replace('/', '')}) com QR Code Pix instantâneo será gerada na hora.
                </span>
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex justify-end gap-3 pt-3 border-t border-brand-border-strong">
              <button
                type="button"
                onClick={() => setShowChangePlanModal(false)}
                disabled={isChangingPlan}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-brand-text-muted hover:text-brand-text"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmChangePlan}
                disabled={isChangingPlan}
                className="px-6 py-2.5 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChangingPlan ? 'animate-spin' : ''}`} />
                <span>{isChangingPlan ? 'Atualizando Assinatura...' : 'Confirmar Alteração de Plano'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Informar CPF/Nome se faltar */}
      {showCpfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-brand-border-strong">
              <h3 className="font-display font-bold text-base text-brand-text">
                Dados para Emissão no Asaas
              </h3>
              <button
                type="button"
                onClick={() => setShowCpfModal(false)}
                className="p-1 text-brand-text-muted hover:text-brand-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-brand-text-muted">
              Para gerar faturas e Pix no Asaas, o Banco Central exige um CPF/CNPJ válido do pagador:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1">Seu Nome Completo</label>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Nome completo do tutor"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1">Seu CPF (apenas números)</label>
                <input
                  type="text"
                  value={tempCpf}
                  onChange={(e) => setTempCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text mb-1">WhatsApp com DDD</label>
                <input
                  type="text"
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="11999998888"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-border-strong">
              <button
                type="button"
                onClick={() => setShowCpfModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-brand-text-muted hover:text-brand-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserCpf(tempCpf);
                  setUserName(tempName);
                  setUserPhone(tempPhone);
                  void handleGenerateInvoice(planId, planPrice, tempCpf, tempName, tempPhone);
                }}
                disabled={!tempCpf.replace(/\D/g, '') || tempCpf.replace(/\D/g, '').length < 11}
                className="px-5 py-2 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 disabled:opacity-40"
              >
                Gerar Fatura & Pix
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
