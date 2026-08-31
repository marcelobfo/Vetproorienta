'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import QRCode from 'qrcode';
import { 
  CheckCircle2, Zap, Lock, CreditCard, RefreshCw, QrCode, 
  Copy, ExternalLink, AlertCircle, FileText, 
  Sparkles, Check, Clock, ShieldCheck, Download,
  Wallet, User, X, MessageCircle, Send, Smartphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAsaasConfig, verifyAndUnlockSubscription, broadcastSubscriptionUnlock } from '@/lib/asaas';

interface AsaasPaymentItem {
  id: string;
  dateCreated: string;
  dueDate: string;
  value: number;
  netValue?: number;
  billingType: string;
  status: string;
  description?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  paymentLink?: string;
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
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>('PENDING_PAYMENT');
  
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

  // Link direto de WhatsApp derivado
  const computedWhatsappUrl = useMemo(() => {
    if (!pixCopiaECola) return '';
    const targetPhone = (userPhone || '').replace(/\D/g, '');
    const waPhone = targetPhone.length === 10 || targetPhone.length === 11 ? `55${targetPhone}` : targetPhone;
    const waMsg = `🐶 *VetPro Orienta - Fatura da sua Assinatura*\n\nOlá, *${userName || 'Tutor'}*!\nSua fatura para o *Plano ${planName}* (R$ ${paymentValue.toFixed(2).replace('.', ',')}/mês) está pronta.\n\n⚡ *PAGAMENTO VIA PIX (Liberação Imediata):*\n\`\`\`${pixCopiaECola}\`\`\`\n\n💳 *OU PAGUE COM CARTÃO/BOLETO:*\n${paymentUrl || 'https://vetpro.app'}\n\nApós o pagamento, o acesso à Triagem e aos Pets é liberado na hora!`;
    
    return waPhone 
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
  }, [pixCopiaECola, userPhone, userName, planName, paymentValue, paymentUrl]);

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

  // Histórico de Faturas do Asaas
  const [invoices, setInvoices] = useState<AsaasPaymentItem[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);

  // Efeito para sincronização global de desbloqueio
  useEffect(() => {
    const handleGlobalUnlock = (e: any) => {
      if (e?.detail?.active) {
        setHasActivePlan(true);
        setSubscriptionStatus('ACTIVE');
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

  // Efeito para garantir que o QR Code seja gerado a partir do Pix Copia e Cola no navegador
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

        if (localPlan === 'especialista') {
          setPlanId('especialista');
          setPlanName('Especialista');
          setPlanPrice(29.90);
          setPaymentValue(29.90);
        } else {
          setPlanId('essencial');
          setPlanName('Essencial');
          setPlanPrice(9.90);
          setPaymentValue(9.90);
        }

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

            if (profile.plan_id) setPlanId(profile.plan_id);
            if (profile.plan_name) setPlanName(profile.plan_name);
            if (profile.asaas_customer_id) {
              setCustomerId(profile.asaas_customer_id);
              activeCustId = profile.asaas_customer_id;
            }
            if (profile.subscription_id) {
              setSubscriptionId(profile.subscription_id);
              activeSubId = profile.subscription_id;
            }

            const isActive = profile.subscription_status === 'ACTIVE' || profile.subscription_status === 'CONFIRMED' || profile.subscription_status === 'RECEIVED';
            setHasActivePlan(isActive);
            setSubscriptionStatus(profile.subscription_status || 'PENDING_PAYMENT');
            
            if (profile.plan_id === 'especialista' || profile.plan_name?.toLowerCase().includes('especialista')) {
              setPlanPrice(29.90);
              setPaymentValue(29.90);
            } else {
              setPlanPrice(9.90);
              setPaymentValue(9.90);
            }
          }
        } else {
          setUserName(localName || 'Tutor');
          setUserEmail(localEmail);
          setCardHolderName(localName || 'Tutor');
        }

        // Se houver dados no Asaas, busca faturas e links
        if (activeCustId || activeSubId || activeEmail) {
          try {
            const res = await fetch(`/api/asaas/check-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: activeCustId,
                subscriptionId: activeSubId,
                email: activeEmail,
                userId: activeUserId,
              }),
            });

            const data = await res.json();
            if (isMounted && data.success) {
              if (data.payment) {
                setInvoices([data.payment]);
              }
              if (data.paymentId) setPaymentId(data.paymentId);
              if (data.invoiceUrl) setPaymentUrl(data.invoiceUrl);
              if (data.bankSlipUrl) setBankSlipUrl(data.bankSlipUrl);
              if (data.identificationField) setIdentificationField(data.identificationField);
              if (data.pixQrCodeImage) setPixQrCode(data.pixQrCodeImage);
              if (data.pixCopiaECola) setPixCopiaECola(data.pixCopiaECola);
              if (data.dueDate) setPaymentDueDate(data.dueDate);
              if (data.value) setPaymentValue(data.value);
            }
          } catch (e) {
            console.warn('Erro ao buscar faturas iniciais:', e);
          }
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
  }, []);

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
          setActionFeedback({
            type: 'success',
            message: '🎉 Pagamento identificado automaticamente! Seu acesso foi 100% liberado.',
          });
        }
      } catch {
        // Silencioso no background
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [hasActivePlan, activePaymentTab, customerId, subscriptionId, userEmail, userId]);

  // Busca lista de faturas do cliente no Asaas sob demanda
  const fetchInvoices = async (targetCustId?: string) => {
    const custId = targetCustId || customerId;
    if (!custId && !subscriptionId && !userEmail) return;

    setIsLoadingInvoices(true);
    try {
      const res = await fetch(`/api/asaas/check-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: custId,
          subscriptionId,
          email: userEmail,
          userId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.payment) {
          setInvoices([data.payment]);
        }
        if (data.paymentId) setPaymentId(data.paymentId);
        if (data.invoiceUrl) setPaymentUrl(data.invoiceUrl);
        if (data.bankSlipUrl) setBankSlipUrl(data.bankSlipUrl);
        if (data.identificationField) setIdentificationField(data.identificationField);
        if (data.pixQrCodeImage) setPixQrCode(data.pixQrCodeImage);
        if (data.pixCopiaECola) setPixCopiaECola(data.pixCopiaECola);
      }
    } catch (e) {
      console.warn('Erro ao buscar histórico de faturas:', e);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

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
  const handleSendToWhatsapp = async (overridePhone?: string) => {
    const targetPhone = overridePhone || userPhone;
    setIsSendingWhatsapp(true);
    setWhatsappSentSuccess(null);

    try {
      const res = await fetch('/api/asaas/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: targetPhone,
          name: userName,
          email: userEmail,
          planName,
          planPrice,
          pixCopiaECola,
          paymentUrl,
          bankSlipUrl,
          dueDate: paymentDueDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.whatsappUrl) {
          setCustomWhatsappUrl(data.whatsappUrl);
        }
        if (data.sentViaEvolution) {
          setWhatsappSentSuccess('✅ Fatura e Pix enviados com sucesso para o seu WhatsApp!');
        } else {
          setWhatsappSentSuccess('📲 Link do WhatsApp pronto! Clique em "Abrir no WhatsApp" para visualizar.');
        }
      } else {
        setWhatsappSentSuccess(data.error || 'Não foi possível disparar pelo WhatsApp.');
      }
    } catch {
      setWhatsappSentSuccess('Erro ao conectar com o serviço de WhatsApp.');
    } finally {
      setIsSendingWhatsapp(false);
    }
  };

  // Função para GERAR FATURA DA ASSINATURA no Asaas
  const handleGenerateInvoice = async (targetPlanId?: string, targetPlanPrice?: number, overrideCpf?: string, overrideName?: string, overridePhone?: string) => {
    const activeCpf = overrideCpf || userCpf;
    const activeName = overrideName || userName;
    const activePhone = overridePhone || userPhone;

    // Se não temos cliente nem CPF válido, abre modal de preenchimento rápido
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
    const selectedPrice = targetPlanPrice !== undefined ? targetPlanPrice : planPrice;
    const selectedName = selectedPlan === 'especialista' ? 'Especialista' : 'Essencial';

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
          planId: selectedPlan,
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
          setPlanId(targetPlanId);
          setPlanName(selectedName);
          setPlanPrice(selectedPrice);
          if (typeof window !== 'undefined') localStorage.setItem('vetpro_selected_plan', targetPlanId);
        }

        setShowCpfModal(false);
        setActionFeedback({
          type: 'success',
          message: '⚡ Fatura e QR Code Pix gerados com sucesso! Você já pode escanear, copiar a chave ou receber no WhatsApp.',
        });

        // Recarrega lista
        if (data.customerId) {
          void fetchInvoices(data.customerId);
        }
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
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') || '' : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') || '' : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') || '' : '';

      const res = await fetch('/api/asaas/pay-with-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          subscriptionId,
          paymentId,
          userId,
          email: userEmail,
          planId,
          planName,
          planPrice,
          card: {
            holderName: cardHolderName,
            number: cleanCard,
            expiryMonth: cardExpiryMonth,
            expiryYear: cardExpiryYear,
            ccv: cleanCvv,
          },
          holderInfo: {
            name: cardHolderName,
            email: userEmail,
            cpfCnpj: cleanCpf || '00000000000',
            postalCode: cardHolderPostalCode || '01310100',
            addressNumber: cardHolderAddressNumber || '1',
            phone: (cardHolderPhone || userPhone).replace(/\D/g, '') || '11999999999',
            mobilePhone: (cardHolderPhone || userPhone).replace(/\D/g, '') || '11999999999',
          },
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

      if (data.success && (data.paid || data.status === 'CONFIRMED' || data.status === 'RECEIVED')) {
        setHasActivePlan(true);
        setSubscriptionStatus('ACTIVE');
        broadcastSubscriptionUnlock({ planName, status: 'ACTIVE' });
        setActionFeedback({
          type: 'success',
          message: '🎉 Pagamento com cartão de crédito APROVADO no Asaas! Sua assinatura está ATIVA e o acesso está liberado.',
        });
        setCardNumber('');
        setCardCcv('');
      } else if (data.success) {
        setActionFeedback({
          type: 'info',
          message: `Pagamento enviado para a operadora (Status: ${data.status}). Clique em "Verificar e Desbloquear Acesso" em instantes.`,
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: data.error || 'Cartão recusado ou dados inválidos. Verifique os números e tente novamente.',
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err.message || 'Erro de comunicação com a operadora de cartão.',
      });
    } finally {
      setIsProcessingCard(false);
    }
  };

  // Função ÚNICA E CENTRALIZADA para VERIFICAR PAGAMENTO no Asaas e liberar tudo globalmente
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

      if (result.success && result.paid) {
        setHasActivePlan(true);
        setSubscriptionStatus('ACTIVE');
        setActionFeedback({
          type: 'success',
          message: '🎉 Pagamento confirmado no Asaas! Sua assinatura está ATIVA e todas as telas foram liberadas.',
        });
      } else if (result.success) {
        if (result.pixQrCodeImage) setPixQrCode(result.pixQrCodeImage);
        if (result.pixCopiaECola) setPixCopiaECola(result.pixCopiaECola);
        if (result.paymentUrl) setPaymentUrl(result.paymentUrl);
        if (result.bankSlipUrl) setBankSlipUrl(result.bankSlipUrl);
        if (result.identificationField) setIdentificationField(result.identificationField);

        setActionFeedback({
          type: 'info',
          message: 'A fatura ainda consta como pendente no Asaas. Se você acabou de efetuar o Pix ou Cartão, aguarde alguns segundos enquanto o banco compensa.',
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: result.message || 'Aguardando sincronização com o banco.',
        });
      }
    } catch {
      setActionFeedback({
        type: 'error',
        message: 'Erro ao verificar pagamento. Tente novamente.',
      });
    } finally {
      setIsCheckingPayment(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-brand-text-muted">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-teal" />
          <p className="text-xs">Carregando dados da assinatura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
              Assinatura & Formas de Pagamento 💳
            </h1>
            <p className="text-brand-text-muted text-xs md:text-sm">
              Escolha pagar por Pix, Cartão de Crédito ou Boleto Bancário com segurança pelo Asaas.
            </p>
          </div>

          {/* BARRA DE AÇÃO PRINCIPAL E CENTRALIZADA */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleVerifyPayment}
              disabled={isCheckingPayment}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95"
              title="Verificar e liberar todo o sistema"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingPayment ? 'animate-spin' : ''}`} />
              {isCheckingPayment ? 'Verificando no Asaas...' : '✅ Verificar e Desbloquear Acesso'}
            </button>
            <button
              onClick={() => handleGenerateInvoice()}
              disabled={isGeneratingInvoice}
              className="px-4 py-3 rounded-xl bg-brand-surface border border-brand-border-strong hover:bg-brand-surface-2 text-brand-text font-bold text-xs flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Zap className={`w-4 h-4 text-brand-teal ${isGeneratingInvoice ? 'animate-spin' : ''}`} />
              {isGeneratingInvoice ? 'Gerando Fatura...' : '⚡ Reemitir Fatura & Pix'}
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className={`p-4 rounded-2xl border text-xs md:text-sm font-medium flex items-start gap-3 transition-all ${
            actionFeedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : actionFeedback.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-brand-teal/10 border-brand-teal/30 text-brand-teal'
          }`}>
            {actionFeedback.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
            {actionFeedback.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            {actionFeedback.type === 'info' && <Clock className="w-5 h-5 shrink-0 mt-0.5" />}
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
                  Plano Selecionado
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  hasActivePlan 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}>
                  {hasActivePlan ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {hasActivePlan ? 'Assinatura Ativa & Liberada' : 'Aguardando Pagamento'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-brand-text">
                VetPro <span className="text-brand-teal">{planName}</span>
              </h2>
              <p className="text-xs md:text-sm text-brand-text-muted">
                {hasActivePlan 
                  ? 'Sua assinatura mensal está em dia. Você tem acesso completo a todas as funcionalidades do plano em todo o sistema.' 
                  : 'Efetue o pagamento abaixo por Pix, Cartão ou Boleto. Assim que confirmado, todas as telas do sistema são liberadas de uma só vez.'}
              </p>
            </div>

            <div className="bg-brand-surface-2 p-5 rounded-2xl border border-brand-border-strong text-right shrink-0 min-w-[200px]">
              <span className="text-[11px] font-semibold text-brand-text-muted uppercase tracking-wider block mb-1">
                Valor Recorrente
              </span>
              <div className="text-3xl font-display font-bold text-brand-text">
                R$ {planPrice.toFixed(2).replace('.', ',')}
                <span className="text-xs text-brand-text-muted font-normal">/mês</span>
              </div>
              <div className="text-[11px] text-brand-text-muted mt-1">
                Ciclo: Mensal (Asaas)
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
              <span className="font-semibold text-brand-teal capitalize block mt-0.5">
                {subscriptionStatus}
              </span>
            </div>

            <div className="p-3 bg-brand-surface-2/60 rounded-xl border border-brand-border">
              <span className="text-brand-text-muted block text-[10px] uppercase font-semibold">Vencimento da Fatura</span>
              <span className="font-semibold text-brand-text block mt-0.5">
                {paymentDueDate ? new Date(paymentDueDate).toLocaleDateString('pt-BR') : 'Imediato / 1 dia'}
              </span>
            </div>
          </div>
        </div>

        {/* Bloco de Opções de Pagamento: PIX | CARTÃO DE CRÉDITO | BOLETO */}
        {(!hasActivePlan || pixQrCode || paymentUrl) && (
          <div className="bg-brand-surface border-2 border-brand-teal/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
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

                  {/* Integração com WhatsApp */}
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
                        {isSendingWhatsapp ? 'Enviando...' : '📲 Enviar para meu WhatsApp'}
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
                    Pagamento 100% seguro processado diretamente via <strong>Asaas Gateway</strong>. Os dados do seu cartão são criptografados de ponta a ponta e a liberação é imediata em todo o sistema.
                  </p>
                </div>

                <form onSubmit={handlePayWithCreditCard} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Número do Cartão */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-brand-text flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-brand-teal" />
                        Número do Cartão de Crédito
                      </label>
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      />
                    </div>

                    {/* Nome Impresso */}
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-brand-text">
                        Nome Impresso no Cartão
                      </label>
                      <input
                        type="text"
                        required
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                        placeholder="Ex: MARCELO SILVA"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal uppercase"
                      />
                    </div>

                    {/* Validade */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-brand-text">
                        Validade (Mês / Ano)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={cardExpiryMonth}
                          onChange={(e) => setCardExpiryMonth(e.target.value)}
                          placeholder="MM"
                          className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-center text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                        />
                        <input
                          type="text"
                          required
                          maxLength={4}
                          value={cardExpiryYear}
                          onChange={(e) => setCardExpiryYear(e.target.value)}
                          placeholder="AAAA"
                          className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-center text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                        />
                      </div>
                    </div>

                    {/* CVV */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-brand-text">
                        Código de Segurança (CVV)
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCcv}
                        onChange={(e) => setCardCcv(e.target.value)}
                        placeholder="123"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-center text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      />
                    </div>

                    {/* CPF do Titular */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-brand-text">
                        CPF do Titular do Cartão
                      </label>
                      <input
                        type="text"
                        required
                        value={cardHolderCpf}
                        onChange={(e) => setCardHolderCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      />
                    </div>

                    {/* Telefone do Titular */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-brand-text">
                        WhatsApp / Celular
                      </label>
                      <input
                        type="text"
                        value={cardHolderPhone}
                        onChange={(e) => setCardHolderPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      />
                    </div>

                    {/* CEP */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-brand-text">
                        CEP de Cobrança
                      </label>
                      <input
                        type="text"
                        value={cardHolderPostalCode}
                        onChange={(e) => setCardHolderPostalCode(e.target.value)}
                        placeholder="01310-100"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                      />
                    </div>

                    {/* Número do Endereço */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-brand-text">
                        Número do Endereço
                      </label>
                      <input
                        type="text"
                        value={cardHolderAddressNumber}
                        onChange={(e) => setCardHolderAddressNumber(e.target.value)}
                        placeholder="Ex: 100"
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                      />
                    </div>
                  </div>

                  <div className="pt-3 flex flex-col sm:flex-row gap-3">
                    <button
                      type="submit"
                      disabled={isProcessingCard}
                      className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <ShieldCheck className={`w-4 h-4 ${isProcessingCard ? 'animate-spin' : ''}`} />
                      {isProcessingCard 
                        ? 'Processando no Asaas...' 
                        : `Pagar R$ ${paymentValue.toFixed(2).replace('.', ',')} com Cartão de Crédito`}
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
        )}

        {/* Seção de Planos e Upgrade */}
        <div>
          <div className="mb-6">
            <h2 className="font-display text-xl md:text-2xl font-bold text-brand-text mb-1">
              Planos & Upgrades
            </h2>
            <p className="text-xs md:text-sm text-brand-text-muted">
              Alterne entre os planos disponíveis para expandir a orientação clínica dos seus pets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Plano Essencial */}
            <div className={`bg-brand-surface border rounded-3xl p-6 md:p-8 relative flex flex-col justify-between transition-all ${
              planId === 'essencial' 
                ? 'border-brand-teal/60 ring-1 ring-brand-teal/30 shadow-lg' 
                : 'border-brand-border-strong'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-display font-bold text-brand-text">Essencial</h3>
                  {planId === 'essencial' && (
                    <span className="bg-brand-teal/15 text-brand-teal border border-brand-teal/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Plano Atual
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-text-muted mb-6">
                  Triagem clínica com IA inteligente e gestão completa da saúde preventiva.
                </p>
                <div className="text-3xl font-display font-bold mb-6 text-brand-text">
                  R$ 9,90 <span className="text-xs text-brand-text-muted font-normal">/mês</span>
                </div>

                <ul className="space-y-3 mb-8 text-xs text-brand-text">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                    Triagem inteligente com IA treinada
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                    Cadastro e histórico completo de pets
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                    Orientações de primeiros socorros
                  </li>
                </ul>
              </div>

              {planId !== 'essencial' ? (
                <button
                  type="button"
                  onClick={() => handleGenerateInvoice('essencial', 9.90)}
                  disabled={isGeneratingInvoice}
                  className="w-full py-3 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:bg-brand-surface text-brand-text font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Mudar para o Essencial (R$ 9,90/mês)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerateInvoice('essencial', 9.90)}
                  disabled={isGeneratingInvoice}
                  className="w-full py-3 rounded-xl bg-brand-teal/15 border border-brand-teal/30 text-brand-teal font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-brand-teal/25"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Gerar Fatura do Essencial
                </button>
              )}
            </div>

            {/* Plano Especialista */}
            <div className={`bg-gradient-to-b from-brand-surface-2 to-brand-surface border rounded-3xl p-6 md:p-8 relative flex flex-col justify-between transition-all overflow-hidden ${
              planId === 'especialista' 
                ? 'border-brand-accent ring-1 ring-brand-accent/40 shadow-xl' 
                : 'border-brand-accent/40 hover:border-brand-accent'
            }`}>
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-brand-accent text-brand-accent-ink text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-md">
                  Recomendado
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-display font-bold text-brand-text">Especialista</h3>
                </div>
                <p className="text-xs text-brand-text-muted mb-6">
                  Desbloqueie atendimento humano especializado e análise veterinária aprofundada.
                </p>
                <div className="text-3xl font-display font-bold mb-6 text-brand-text">
                  R$ 29,90 <span className="text-xs text-brand-text-muted font-normal">/mês</span>
                </div>

                <ul className="space-y-3 mb-8 text-xs text-brand-text">
                  <li className="flex items-center gap-2.5 font-semibold text-amber-300">
                    <Zap className="w-4 h-4 text-brand-accent fill-brand-accent shrink-0" />
                    Atendimento humano por veterinários parceiros
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                    Triagem com IA com prioridade alta
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                    Histórico ilimitado e relatórios para impressão
                  </li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleGenerateInvoice('especialista', 29.90)}
                disabled={isGeneratingInvoice}
                className="w-full py-3.5 rounded-xl bg-brand-accent text-brand-accent-ink font-bold text-xs hover:-translate-y-0.5 shadow-lg shadow-brand-accent/20 transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-brand-accent-ink" />
                {planId === 'especialista' ? 'Gerar Fatura do Especialista (R$ 29,90)' : 'Fazer Upgrade para Especialista (R$ 29,90)'}
              </button>
            </div>
          </div>
        </div>

        {/* Histórico de Faturas Recentes */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 md:p-8 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-brand-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-teal" />
                Histórico de Cobranças no Asaas
              </h3>
              <p className="text-xs text-brand-text-muted">
                Registro das últimas faturas emitidas vinculadas à sua conta.
              </p>
            </div>
            <button
              onClick={() => fetchInvoices()}
              disabled={isLoadingInvoices}
              className="p-2 rounded-xl bg-brand-surface-2 border border-brand-border hover:bg-brand-surface text-brand-text-muted hover:text-brand-text text-xs"
              title="Recarregar faturas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvoices ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingInvoices ? (
            <div className="py-8 text-center text-xs text-brand-text-muted">
              Carregando faturas do Asaas...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-8 text-center bg-brand-surface-2/40 rounded-2xl border border-dashed border-brand-border text-xs text-brand-text-muted">
              Nenhuma cobrança anterior registrada ainda. Clique em &quot;Reemitir Fatura & Pix&quot; para emitir a primeira fatura.
            </div>
          ) : (
            <div className="divide-y divide-brand-border-strong overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-brand-text-muted border-b border-brand-border-strong pb-2">
                    <th className="py-2.5 font-semibold">ID / Fatura</th>
                    <th className="py-2.5 font-semibold">Vencimento</th>
                    <th className="py-2.5 font-semibold">Valor</th>
                    <th className="py-2.5 font-semibold">Status</th>
                    <th className="py-2.5 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-brand-surface-2/40 transition-colors">
                      <td className="py-3 font-mono font-medium text-brand-text">
                        {inv.id}
                      </td>
                      <td className="py-3 text-brand-text-muted">
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className="py-3 font-bold text-brand-text">
                        R$ {Number(inv.value).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'RECEIVED' || inv.status === 'CONFIRMED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : inv.status === 'PENDING'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-brand-surface-2 text-brand-text-muted'
                        }`}>
                          {inv.status === 'RECEIVED' || inv.status === 'CONFIRMED' ? 'PAGO' : inv.status === 'PENDING' ? 'PENDENTE' : inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {(inv.invoiceUrl || inv.bankSlipUrl || inv.paymentLink) && (
                          <a
                            href={inv.invoiceUrl || inv.bankSlipUrl || inv.paymentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-surface-2 hover:bg-brand-surface text-brand-teal font-semibold text-[11px] border border-brand-border"
                          >
                            Abrir Fatura <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de CPF / Telefone para Emissão da Fatura */}
        {showCpfModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-brand-surface border-2 border-brand-teal/40 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
              <button
                type="button"
                onClick={() => setShowCpfModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 flex items-center justify-center text-brand-teal">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-brand-text">
                    Dados para Fatura Asaas
                  </h3>
                  <p className="text-xs text-brand-text-muted">
                    O Banco Central exige CPF/CNPJ para emissão de Pix e envio automático por WhatsApp.
                  </p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tempCpf || tempCpf.replace(/\D/g, '').length < 11) {
                    setActionFeedback({
                      type: 'error',
                      message: 'Por favor, informe um CPF válido com 11 dígitos.',
                    });
                    return;
                  }
                  setUserCpf(tempCpf);
                  if (tempName) setUserName(tempName);
                  if (tempPhone) setUserPhone(tempPhone);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('vetpro_user_cpf', tempCpf);
                    if (tempName) localStorage.setItem('vetpro_tutor_name', tempName);
                    if (tempPhone) localStorage.setItem('vetpro_user_phone', tempPhone);
                  }
                  setShowCpfModal(false);
                  void handleGenerateInvoice(planId, planPrice, tempCpf, tempName, tempPhone);
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1.5">
                    Nome Completo:
                  </label>
                  <input
                    type="text"
                    required
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1.5">
                    CPF ou CNPJ:
                  </label>
                  <input
                    type="text"
                    required
                    value={tempCpf}
                    onChange={(e) => setTempCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-text mb-1.5">
                    WhatsApp / Telefone para receber o Pix:
                  </label>
                  <input
                    type="text"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs font-mono text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCpfModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border text-xs font-semibold text-brand-text"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isGeneratingInvoice}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    {isGeneratingInvoice ? 'Emitindo...' : 'Emitir Fatura & Pix'}
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
