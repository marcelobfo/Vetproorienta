'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PawPrint, CheckCircle2, Video, Heart, Shield, HelpCircle, 
  MessageCircle, X, Clock, Smartphone, Laptop, Star, Search, FileText, 
  AlertCircle, RefreshCw, Lock, Sparkles, ChevronDown, 
  ShieldAlert, Stethoscope, HeartPulse, UserCheck, Baby, Activity, Navigation, Building, Download,
  XCircle, Ban, ShieldCheck, BrainCircuit, AlertTriangle, Zap, Check
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createAsaasCustomer, createAsaasSubscription, getAsaasConfig } from '@/lib/asaas';
import { getEvolutionConfig } from '@/lib/evolution';
import { PartnerRotativeAds } from '@/components/PartnerRotativeAds';
import { supabase } from '@/lib/supabase';
import { triggerPWAInstallModal } from '@/components/PwaInstallPrompt';

export default function LandingPage() {
  const router = useRouter();

  // Detecta se o usuário caiu na landing page vindo de um link de redefinição de senha
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
        router.replace(`/redefinir-senha${hash || search}`);
      }
    }
  }, [router]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [advantagesMode, setAdvantagesMode] = useState<'benefits' | 'comparison' | 'hidden'>('benefits');

  useEffect(() => {
    // Carrega modo da seção de vantagens
    const loadAdvantagesMode = async () => {
      try {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('vetpro_home_advantages_mode');
          if (saved === 'benefits' || saved === 'comparison' || saved === 'hidden') {
            setAdvantagesMode(saved);
          }
        }
        const res = await fetch('/api/admin/home-settings');
        const data = await res.json();
        if (data?.settings?.advantages_mode) {
          setAdvantagesMode(data.settings.advantages_mode);
        }
      } catch {}
    };
    loadAdvantagesMode();

    const handleModeChange = (e: any) => {
      if (e?.detail?.mode) {
        setAdvantagesMode(e.detail.mode);
      }
    };
    window.addEventListener('vetpro_home_mode_changed', handleModeChange);
    return () => {
      window.removeEventListener('vetpro_home_mode_changed', handleModeChange);
    };
  }, []);

  const [dynamicPlans, setDynamicPlans] = useState<any[]>([
    {
      id: "essencial",
      name: "Essencial",
      desc: "Orientação e triagem técnica contínua pelo chat da plataforma VetPro Orienta",
      price: "9,90",
      numericPrice: 9.90,
      period: "/mês",
      billing_cycle: "MONTHLY",
      comparison_badge: "",
      is_coming_soon: false,
      is_popular: false,
      features: [
        { text: "Orientação e triagem técnica pelo chat da plataforma VetPro Orienta", strong: false, hasLock: false },
        { text: "Envio de fotos e resultados de exames para análise", strong: false, hasLock: false },
        { text: "Respostas ágeis e direcionamento estruturado", strong: false, hasLock: false },
        { text: "Suporte informativo contínuo para o dia a dia", strong: false, hasLock: false },
        { text: "Cancele quando quiser, sem carência ou fidelidade", strong: false, hasLock: false }
      ]
    },
    {
      id: "anual-promocional",
      name: "Anual Essencial",
      desc: "Acesso completo o ano inteiro por apenas R$ 4,99/mês (Economize 50% em relação ao mensal de R$ 9,90)",
      price: "59,90",
      numericPrice: 59.90,
      period: "/ano",
      billing_cycle: "YEARLY",
      comparison_badge: "Mais Vendido — Economize 50% vs R$ 9,90/mês",
      is_coming_soon: false,
      is_popular: true,
      features: [
        { text: "Tudo incluído do plano Essencial o ano inteiro", strong: true, hasLock: false },
        { text: "Orientação e triagem técnica contínua 365 dias", strong: false, hasLock: false },
        { text: "Envio ilimitado de fotos e exames para triagem", strong: false, hasLock: false },
        { text: "Equivalente a apenas R$ 4,99/mês (Cobrado R$ 59,90/ano)", strong: true, hasLock: false },
        { text: "Economia de R$ 58,90 em relação ao plano mensal de R$ 9,90", strong: true, hasLock: false },
        { text: "Garantia e renovação automática anual sem burocracia", strong: false, hasLock: false }
      ]
    },
    {
      id: "especialista",
      name: "Especialista",
      desc: "Atendimento com médico-veterinário especialista dedicado",
      price: "29,90",
      numericPrice: 29.90,
      period: "/mês",
      billing_cycle: "MONTHLY",
      comparison_badge: "",
      is_coming_soon: true, // Requisito: Exibido visualmente porém desabilitado e marcado como EM BREVE
      is_popular: false,
      features: [
        { text: "Tudo incluído do plano Essencial", strong: false, hasLock: false },
        { text: "Atendimento com médico-veterinário especialista", strong: true, hasLock: true },
        { text: "Avaliação cuidadosa de exames e histórico clínico", strong: true, hasLock: false },
        { text: "Prioridade máxima de resposta e acompanhamento", strong: false, hasLock: false },
        { text: "Cancele quando quiser, sem fidelidade", strong: false, hasLock: false }
      ]
    }
  ]);

  // Carrega planos da API e sincroniza na Home pública garantindo estritamente os 3 planos oficiais (Essencial, Anual, Especialista)
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/admin/plans?active=true');
        const data = await res.json();
        if (data.plans && Array.isArray(data.plans) && data.plans.length > 0) {
          const defaultFeaturesMap: Record<string, any[]> = {
            essencial: [
              { text: "Orientação e triagem técnica pelo chat da plataforma VetPro Orienta", strong: false, hasLock: false },
              { text: "Envio de fotos e resultados de exames para análise", strong: false, hasLock: false },
              { text: "Respostas ágeis e direcionamento estruturado", strong: false, hasLock: false },
              { text: "Suporte informativo contínuo para o dia a dia", strong: false, hasLock: false },
              { text: "Cancele quando quiser, sem carência ou fidelidade", strong: false, hasLock: false }
            ],
            'anual-promocional': [
              { text: "Tudo incluído do plano Essencial o ano inteiro", strong: true, hasLock: false },
              { text: "Orientação e triagem técnica contínua 365 dias", strong: false, hasLock: false },
              { text: "Envio ilimitado de fotos e exames para triagem", strong: false, hasLock: false },
              { text: "Equivalente a apenas R$ 4,99/mês (Cobrado R$ 59,90/ano)", strong: true, hasLock: false },
              { text: "Economia de R$ 58,90 em relação ao plano mensal de R$ 9,90", strong: true, hasLock: false },
              { text: "Garantia e renovação automática anual sem burocracia", strong: false, hasLock: false }
            ],
            especialista: [
              { text: "Tudo incluído do plano Essencial", strong: false, hasLock: false },
              { text: "Atendimento com médico-veterinário especialista", strong: true, hasLock: true },
              { text: "Avaliação cuidadosa de exames e histórico clínico", strong: true, hasLock: false },
              { text: "Prioridade máxima de resposta e acompanhamento", strong: false, hasLock: false },
              { text: "Cancele quando quiser, sem fidelidade", strong: false, hasLock: false }
            ]
          };

          // Mapeia estritamente os 3 slots canônicos da Home sem duplicatas
          const slotMap: Record<'essencial' | 'anual-promocional' | 'especialista', any | null> = {
            'essencial': null,
            'anual-promocional': null,
            'especialista': null
          };

          for (const p of data.plans) {
            if (p.is_active === false) continue;
            const slug = (p.slug || p.id || '').toLowerCase();
            const name = (p.name || '').toLowerCase();

            if (!slotMap['anual-promocional'] && (slug.includes('anual') || name.includes('anual') || p.billing_cycle === 'YEARLY' || Number(p.price_annual) === 59.90 || Number(p.price_monthly) === 4.99)) {
              slotMap['anual-promocional'] = p;
            } else if (!slotMap['especialista'] && (slug.includes('especialista') || name.includes('especialista') || Number(p.price_monthly) === 29.90)) {
              slotMap['especialista'] = p;
            } else if (!slotMap['essencial'] && (slug.includes('essencial') || name.includes('essencial') || Number(p.price_monthly) === 9.90)) {
              slotMap['essencial'] = p;
            }
          }

          const resolvedPlans: any[] = [];

          // 1. Essencial
          const rawEssencial = slotMap['essencial'];
          resolvedPlans.push({
            id: 'essencial',
            db_id: rawEssencial?.db_id || rawEssencial?.id || 'essencial',
            name: rawEssencial?.name || 'Essencial',
            desc: rawEssencial?.description || 'Orientação e triagem técnica pelo chat da plataforma VetPro Orienta',
            price: (Number(rawEssencial?.price_monthly) || 9.90).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            numericPrice: Number(rawEssencial?.price_monthly) || 9.90,
            period: '/mês',
            billing_cycle: 'MONTHLY',
            comparison_badge: '',
            is_coming_soon: false,
            is_popular: false,
            features: (Array.isArray(rawEssencial?.features) && rawEssencial.features.length > 0) ? rawEssencial.features : defaultFeaturesMap.essencial
          });

          // 2. Anual Essencial
          const rawAnual = slotMap['anual-promocional'];
          const anualPrice = Number(rawAnual?.price_annual) || 59.90;
          resolvedPlans.push({
            id: 'anual-promocional',
            db_id: rawAnual?.db_id || rawAnual?.id || 'anual-promocional',
            name: rawAnual?.name || 'Anual Essencial',
            desc: rawAnual?.description || 'Acesso completo o ano inteiro por apenas R$ 4,99/mês (Economize 50% em relação ao mensal de R$ 9,90)',
            price: anualPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            numericPrice: anualPrice,
            period: '/ano',
            billing_cycle: 'YEARLY',
            comparison_badge: rawAnual?.comparison_badge || 'Mais Vendido — Economize 50% vs R$ 9,90/mês',
            is_coming_soon: false,
            is_popular: true,
            features: (Array.isArray(rawAnual?.features) && rawAnual.features.length > 0) ? rawAnual.features : defaultFeaturesMap['anual-promocional']
          });

          // 3. Especialista (Plano de R$ 29,90 - Sempre 'Em Breve' e desabilitado para compra na Home)
          const rawEsp = slotMap['especialista'];
          resolvedPlans.push({
            id: 'especialista',
            db_id: rawEsp?.db_id || rawEsp?.id || 'especialista',
            name: rawEsp?.name || 'Especialista',
            desc: rawEsp?.description || 'Atendimento com médico-veterinário especialista dedicado',
            price: (Number(rawEsp?.price_monthly) || 29.90).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            numericPrice: Number(rawEsp?.price_monthly) || 29.90,
            period: '/mês',
            billing_cycle: 'MONTHLY',
            comparison_badge: '',
            is_coming_soon: true, // Sempre Em Breve na vitrine pública para nunca liberar checkout indevido
            is_popular: false,
            features: (Array.isArray(rawEsp?.features) && rawEsp.features.length > 0) ? rawEsp.features : defaultFeaturesMap.especialista
          });

          setDynamicPlans(resolvedPlans);
        }
      } catch (e) {
        console.warn('Usando planos padrão em fallback:', e);
      }
    }
    loadPlans();
  }, []);

  const faqs = [
    {
      question: "A orientação técnica por inteligência artificial substitui uma consulta com médico-veterinário?",
      answer: "Não. A orientação técnica e os recursos de inteligência artificial são ferramentas de triagem, apoio informativo e acolhimento rápido para dúvidas cotidianas. Para uma orientação mais precisa, diagnóstico clínico definitivo ou prescrição de medicamentos, você deve procurar um médico-veterinário presencial de sua confiança ou assinar o nosso Plano Especialista (em breve). A inteligência nunca substitui a avaliação física presencial de um profissional habilitado."
    },
    {
      question: "Como funciona o atendimento no Plano Especialista?",
      answer: "No Plano Especialista (em breve), você terá acesso ao atendimento com médicos-veterinários. Você poderá relatar os sinais clínicos, enviar fotos do pet e laudos de exames laboratoriais ou de imagem. O profissional analisará o caso individualmente, oferecendo um direcionamento aprofundado, orientações de conduta e recomendações personalizadas."
    },
    {
      question: "O que é o serviço de teleorientação da VetPro Orienta?",
      answer: "É um serviço de triagem e orientação contínua para tutores de cães e gatos, realizado 100% dentro da plataforma digital VetPro Orienta. Ajudamos a identificar se os sinais clínicos requerem atendimento hospitalar presencial, tiramos dúvidas sobre vacinação, alimentação, cuidados com filhotes ou pets idosos, prevenindo a automedicação indevida."
    },
    {
      question: "Posso enviar fotos e resultados de exames?",
      answer: "Sim! Você pode anexar fotos de lesões ou alterações e PDFs ou imagens de exames de sangue e ultrassonografia diretamente no chat da plataforma para enriquecer a anamnese."
    },
    {
      question: "Como funciona a assinatura e o pagamento?",
      answer: "A cobrança é mensal e processada de forma 100% segura através do gateway bancário Asaas. Você pode pagar via PIX, Cartão de Crédito ou Boleto Bancário. Não há taxa de adesão, carência ou multas de fidelidade: você pode cancelar a qualquer momento."
    },
    {
      question: "O que devo fazer em casos de emergência grave?",
      answer: "Se o seu pet apresentar sinais clínicos graves (dificuldade respiratória aguda, convulsões ativas, sangramento incontrolável, intoxicação recente ou traumas graves por atropelamento), dirija-se imediatamente a um hospital veterinário 24 horas presencial para atendimento emergencial imediato."
    }
  ];

  const targetAudiences = [
    {
      icon: Baby,
      title: "Tutores de Primeira Viagem",
      description: "Acabou de adotar um filhote e tem dúvidas sobre vacinação, introdução alimentar, vermifugação e adaptação ao novo lar."
    },
    {
      icon: Activity,
      title: "Pets Idosos ou com Condições Crônicas",
      description: "Acompanhamento de exames de rotina, monitoramento de sinais clínicos sutis de dor, dúvidas sobre rotina e qualidade de vida na terceira idade."
    },
    {
      icon: Clock,
      title: "Rotina Corrida sem Tempo a Perder",
      description: "Orientação rápida na palma da mão dentro da plataforma VetPro Orienta para não perder tempo com desinformação na internet nem deslocamentos desnecessários para dúvidas simples."
    },
    {
      icon: ShieldAlert,
      title: "Quem Quer Evitar Erros e Automedicação",
      description: "Segurança total para nunca oferecer alimentos tóxicos ou medicamentos humanos que colocam a vida do seu animal em risco."
    },
    {
      icon: Stethoscope,
      title: "Triagem Confiável e Acolhedora",
      description: "Entenda se o sinal clínico é motivo de urgência imediata ou se pode ser monitorado com segurança até a próxima consulta presencial."
    },
    {
      icon: HeartPulse,
      title: "Quem Busca o Melhor para o Pet",
      description: "Acesso a teleorientação contínua com opção de plano com especialista humano (em breve) para uma avaliação técnica ainda mais completa."
    }
  ];

  const handleOpenModal = (planId: string) => {
    const plan = dynamicPlans.find(p => p.id === planId);
    if (plan && plan.is_coming_soon) {
      return; // Plano em breve não abre contratação
    }
    setSelectedPlan(planId);
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmitError(null);
  };

  const formatCpfCnpj = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14);
    }
    return digits
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .slice(0, 18);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string || '').trim();
    const email = (formData.get('email') as string || '').trim();
    const whatsapp = (formData.get('whatsapp') as string || '').trim();
    const rawCpf = cpfCnpj.replace(/\D/g, '');

    if (!name || rawCpf.length < 11) {
      setSubmitError('Por favor, informe seu nome completo e um CPF/CNPJ válido.');
      return;
    }

    const planObj = dynamicPlans.find(p => p.id === selectedPlan) || dynamicPlans[0];
    if (planObj?.is_coming_soon) {
      setSubmitError('Este plano estará disponível em breve e não aceita contratações no momento.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Obtém configurações locais de Asaas, Supabase e Evolution para garantir que o backend utilize as credenciais configuradas
      const localAsaasConfig = getAsaasConfig();
      const localEvolutionConfig = getEvolutionConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') : '';

      // Chama o endpoint unificado de cadastro: cria cliente no Asaas, cria assinatura, cria usuário no banco com senha=CPF e envia WhatsApp com QR Code Pix
      const regRes = await fetch('/api/cadastro/cliente-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          cpfCnpj: rawCpf,
          whatsapp,
          planId: planObj.id,
          planName: planObj.name,
          planPrice: planObj.numericPrice,
          billingCycle: planObj.billing_cycle || (planObj.id === 'anual-promocional' || planObj.id === 'anual' ? 'YEARLY' : 'MONTHLY'),
          dueDaysOffset: localAsaasConfig.dueDaysOffset !== undefined ? localAsaasConfig.dueDaysOffset : 1,
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
          evolutionConfig: {
            serverUrl: localEvolutionConfig.serverUrl,
            apiKey: localEvolutionConfig.apiKey,
            instanceName: localEvolutionConfig.defaultInstance,
          },
        }),
      });

      const regData = await regRes.json();

      let asaasCustomerId = regData.asaas?.customerId || '';
      let subscriptionId = regData.asaas?.subscriptionId || '';
      let paymentUrl = regData.asaas?.paymentUrl || '';
      let pixQrCodeImage = regData.asaas?.pixQrCodeImage || '';
      let pixCopiaECola = regData.asaas?.pixCopiaECola || '';
      let paymentId = regData.asaas?.paymentId || '';

      // Salva no localStorage para a sessão do tutor
      if (typeof window !== 'undefined') {
        localStorage.setItem('vetpro_tutor_name', name);
        localStorage.setItem('vetpro_tutor_email', email);
        localStorage.setItem('vetpro_tutor_phone', whatsapp);
        localStorage.setItem('vetpro_tutor_cpf', rawCpf);
        localStorage.setItem('vetpro_selected_plan', planObj.id);
        localStorage.setItem('vetpro_subscription_status', 'PENDING_PAYMENT');
        if (asaasCustomerId) {
          localStorage.setItem('vetpro_asaas_customer_id', asaasCustomerId);
        }
        if (subscriptionId) {
          localStorage.setItem('vetpro_asaas_subscription_id', subscriptionId);
        }
        if (paymentUrl) {
          localStorage.setItem('vetpro_payment_url', paymentUrl);
        }
        if (pixQrCodeImage) {
          localStorage.setItem('vetpro_pix_qrcode', pixQrCodeImage);
        }
        if (pixCopiaECola) {
          localStorage.setItem('vetpro_pix_copia_cola', pixCopiaECola);
        }
      }

      // Redireciona para a página de confirmação / onboarding com os dados
      const queryParams = new URLSearchParams({
        nome: name,
        email: email,
        plano: planObj.name,
        planoId: planObj.id,
        valor: planObj.price,
      });

      if (asaasCustomerId) {
        queryParams.set('customer_id', asaasCustomerId);
      }
      if (subscriptionId) {
        queryParams.set('subscription_id', subscriptionId);
      }
      if (paymentUrl) {
        queryParams.set('payment_url', paymentUrl);
      }
      if (paymentId) {
        queryParams.set('payment_id', paymentId);
      }
      if (regData.whatsapp?.sent) {
        queryParams.set('whatsapp_sent', 'true');
      }

      router.push(`/obrigado?${queryParams.toString()}`);
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      const planName = planObj.name;
      router.push(`/obrigado?nome=${encodeURIComponent(name)}&plano=${encodeURIComponent(planName)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative font-body selection:bg-brand-teal/30 selection:text-brand-text">
      
      {/* Background Decorators */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/15 via-brand-bg to-brand-bg h-[650px]" />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-brand-bg/80 backdrop-blur-md border-b border-brand-border-strong">
        <div className="max-w-[1140px] mx-auto px-6 h-[76px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-[20px] tracking-tight">
            <span className="w-[34px] h-[34px] rounded-xl bg-brand-accent/15 flex items-center justify-center text-[18px]">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Orienta</b></span>
          </Link>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-full border border-brand-border-strong hover:bg-brand-surface text-brand-text transition-colors"
            >
              Entrar
            </Link>
            <a 
              href="#planos"
              className="bg-brand-teal text-brand-bg px-4 sm:px-5 py-2 rounded-full font-display font-semibold text-[13.5px] hover:bg-brand-teal/90 transition-all shadow-sm"
            >
              Assinar Plano
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-[120px] pb-20 md:pt-[135px] md:pb-28 overflow-hidden">
        <div className="max-w-[1140px] mx-auto px-6 grid lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-7 flex flex-col items-start -mt-8 md:-mt-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-[12.5px] font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Orientação Veterinária Acessível & Digital</span>
            </div>

            <h1 className="font-display text-[38px] md:text-[50px] font-extrabold leading-[1.12] tracking-tight mb-6">
              Dúvidas sobre seu pet? <br />
              <span className="text-brand-teal">Orientação veterinária</span> na palma da sua mão.
            </h1>

            <p className="text-[17px] text-brand-text-muted leading-[1.65] mb-8 max-w-[560px]">
              Tire dúvidas do dia a dia, entenda os sinais clínicos e receba a melhor recomendação para a saúde do seu cão ou gato, diretamente na plataforma VetPro Orienta.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8">
              <a 
                href="#planos"
                className="bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink px-8 py-4 rounded-full font-display font-bold text-[15px] hover:-translate-y-0.5 hover:shadow-lg transition-all flex items-center justify-center gap-2 text-center"
              >
                Conhecer Planos e Assinar
              </a>
              <a 
                href="#como-funciona"
                className="px-6 py-4 rounded-full bg-brand-surface border border-brand-border-strong font-display font-semibold text-[14px] text-brand-text hover:bg-brand-surface-2 transition-all flex items-center justify-center gap-2 text-center"
              >
                Entenda como funciona
              </a>
            </div>

            {/* Aviso ético sutil na Hero */}
            <div className="p-3.5 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-start gap-2.5 max-w-[560px] text-xs text-brand-text-muted mb-8">
              <Stethoscope className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed">
                <strong className="text-brand-text">Aviso ético importante:</strong> A orientação por inteligência artificial é uma ferramenta de apoio preliminar e não substitui a consulta clínica presencial. Para uma avaliação diagnóstica presencial, consulte sempre seu médico-veterinário de confiança.
              </p>
            </div>

            {/* Badges / Micro-prova social */}
            <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-brand-border-strong/60 w-full text-xs text-brand-text-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                <span>Sem carência</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                <span>Cancele quando quiser</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" />
                <span>Cobrança segura via Asaas</span>
              </div>
            </div>
          </div>

          {/* Foto da Primeira Dobra */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-[420px] rounded-[28px] overflow-hidden border border-brand-border-strong bg-brand-surface shadow-2xl p-3">
              <div className="rounded-[22px] overflow-hidden bg-brand-surface-2 border border-brand-border-strong relative aspect-[4/5] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://oeobudcffkeqejpxpenf.supabase.co/storage/v1/object/public/Imagens/editada_chicao%20(1).png" 
                  alt="Veterinário e Tutor com Pet - VetPro Orienta"
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-transparent to-transparent opacity-80" />
                
                {/* Floating Card */}
                <div className="absolute bottom-4 left-4 right-4 bg-brand-surface/90 backdrop-blur-md border border-brand-border-strong rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold text-sm">
                      🩺
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-text">VetPro Orienta</h4>
                      <p className="text-[11px] text-brand-text-muted">Triagem clínica e teleorientação técnica inteligente</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-20 bg-brand-surface/40 border-y border-brand-border-strong">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="text-center max-w-[680px] mx-auto mb-14">
            <h2 className="font-display text-[30px] font-bold tracking-tight mb-3">Como Funciona a VetPro Orienta?</h2>
            <p className="text-brand-text-muted text-[15px]">Simples, rápido e 100% digital dentro da plataforma VetPro Orienta.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-display font-bold text-base mb-4">
                1
              </div>
              <h3 className="font-display font-bold text-base mb-2">Escolha seu Plano</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Selecione o plano ideal para você e seu pet. Cadastro rápido com validação de CPF e pagamento seguro via Asaas.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-display font-bold text-base mb-4">
                2
              </div>
              <h3 className="font-display font-bold text-base mb-2">Anamnese Ativa & Sinais Clínicos</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                O tutor conta o que está acontecendo com o pet, informa os sinais clínicos e o histórico, pode enviar resultados de exames e a inteligência conduz uma conversa ativa, fazendo perguntas direcionadas para complementar a anamnese e afunilar as informações até uma orientação mais clara e direcionada.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-display font-bold text-base mb-4">
                3
              </div>
              <h3 className="font-display font-bold text-base mb-2">Base Médica-Veterinária Estruturada</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Construída a partir de conhecimento médico-veterinário, base literária estruturada e conteúdos revisados dentro da medicina veterinária, com participação de médico-veterinário especializado na organização desse conhecimento, formando uma estrutura de teleorientação com perguntas e respostas direcionadas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dobra: Vantagens da Plataforma (Modo Benefícios Diretos OU Modo Comparativo Google) */}
      {advantagesMode !== 'hidden' && (
        <section id="vantagens" className="py-24 relative overflow-hidden bg-brand-surface/20 border-b border-brand-border-strong">
          <div className="max-w-[1140px] mx-auto px-6">
            
            {/* VERSÃO 1: MODO BENEFÍCIOS DIRETOS (Sem Comparativo com Google) */}
            {advantagesMode === 'benefits' && (
              <div>
                <div className="text-center max-w-[760px] mx-auto mb-16">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-teal/15 text-brand-teal border border-brand-teal/30 text-xs font-bold uppercase tracking-wider mb-3.5 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-brand-teal" /> Diferenciais Exclusivos
                  </div>
                  <h2 className="font-display text-[32px] md:text-[40px] font-bold tracking-tight mb-4">
                    Por que a <span className="text-brand-teal">VetPro Orienta</span> é a Escolha Mais Segura para o seu Pet?
                  </h2>
                  <p className="text-brand-text-muted text-[15px] md:text-[16px] leading-relaxed">
                    Mais do que respostas rápidas: uma plataforma estruturada sob conhecimento médico-veterinário, que compreende o histórico real do seu animal e orienta você com tranquilidade, acolhimento e responsabilidade.
                  </p>
                </div>

                {/* Grid com 6 Grandes Benefícios */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                  
                  {/* Benefício 1 */}
                  <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 hover:border-brand-teal/40 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-bold text-lg mb-5 border border-brand-teal/20">
                        <BrainCircuit className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-bold text-base text-brand-text mb-2 flex items-center gap-2">
                        Anamnese Ativa & Personalizada
                      </h3>
                      <p className="text-xs text-brand-text-muted leading-relaxed">
                        A IA não oferece diagnósticos estáticos: ela conduz uma conversa interativa fazendo perguntas direcionadas sobre tempo de evolução, mucosas, apetite e comportamento para afunilar a orientação.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-border-strong/60 flex items-center gap-2 text-[11px] text-brand-teal font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Triagem clínica inteligente</span>
                    </div>
                  </div>

                  {/* Benefício 2 */}
                  <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 hover:border-brand-teal/40 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-bold text-lg mb-5 border border-brand-teal/20">
                        <PawPrint className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-bold text-base text-brand-text mb-2 flex items-center gap-2">
                        Prontuário Individual do Pet
                      </h3>
                      <p className="text-xs text-brand-text-muted leading-relaxed">
                        Todas as orientações levam em conta a espécie (cão ou gato), raça específica, idade, peso exato e histórico prévio de vacinas, alergias e condições pré-existentes cadastradas no perfil.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-border-strong/60 flex items-center gap-2 text-[11px] text-brand-teal font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Zero respostas genéricas</span>
                    </div>
                  </div>

                  {/* Benefício 3 */}
                  <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 hover:border-brand-teal/40 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-bold text-lg mb-5 border border-brand-teal/20">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-bold text-base text-brand-text mb-2 flex items-center gap-2">
                        Envio de Fotos e Laudos de Exames
                      </h3>
                      <p className="text-xs text-brand-text-muted leading-relaxed">
                        Anexe fotos de lesões na pele, mucosas, olhos ou fezes, além de laudos de exames laboratoriais e de imagem, para que a triagem tenha máxima fidelidade de dados clínicos.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-border-strong/60 flex items-center gap-2 text-[11px] text-brand-teal font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Suporte visual e documental</span>
                    </div>
                  </div>

                  {/* Benefício 4 */}
                  <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 hover:border-brand-teal/40 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-bold text-lg mb-5 border border-brand-teal/20">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-bold text-base text-brand-text mb-2 flex items-center gap-2">
                        Segurança & Prevenção de Automedicação
                      </h3>
                      <p className="text-xs text-brand-text-muted leading-relaxed">
                        A plataforma segue rigorosos princípios éticos e bloqueia a recomendação de receitas caseiras ou remédios humanos que podem ser tóxicos ou letais para o organismo do seu pet.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-border-strong/60 flex items-center gap-2 text-[11px] text-brand-teal font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Proteção à vida do animal</span>
                    </div>
                  </div>

                  {/* Benefício 5 */}
                  <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 hover:border-brand-teal/40 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-bold text-lg mb-5 border border-brand-teal/20">
                        <Clock className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-bold text-base text-brand-text mb-2 flex items-center gap-2">
                        Apoio 24 Horas, 7 Dias por Semana
                      </h3>
                      <p className="text-xs text-brand-text-muted leading-relaxed">
                        Sintomas inesperados no meio da madrugada, finais de semana ou feriados não precisam ser enfrentados no escuro. Tenha clareza se é caso de emergência ou cuidados de monitoramento.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-border-strong/60 flex items-center gap-2 text-[11px] text-brand-teal font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sempre disponível na palma da mão</span>
                    </div>
                  </div>

                  {/* Benefício 6 */}
                  <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 hover:border-brand-teal/40 transition-all shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-bold text-lg mb-5 border border-brand-teal/20">
                        <Navigation className="w-6 h-6" />
                      </div>
                      <h3 className="font-display font-bold text-base text-brand-text mb-2 flex items-center gap-2">
                        GPS de Pronto-Socorro & Hospitais 24h
                      </h3>
                      <p className="text-xs text-brand-text-muted leading-relaxed">
                        Se a triagem identificar sinais de alerta vermelho (como choque, sangramento ou convulsão), o sistema localiza os hospitais 24h mais próximos e fornece a rota imediata no Google Maps.
                      </p>
                    </div>
                    <div className="mt-5 pt-3 border-t border-brand-border-strong/60 flex items-center gap-2 text-[11px] text-brand-teal font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Agilidade em casos críticos</span>
                    </div>
                  </div>

                </div>

                {/* Banner de Tranquilidade e Confiança */}
                <div className="bg-gradient-to-r from-brand-surface via-brand-surface-2 to-brand-surface border border-brand-teal/30 rounded-[24px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-brand-teal/5">
                  <div className="space-y-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 text-brand-teal text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" /> Compromisso com a Saúde Animal
                    </div>
                    <h3 className="font-display font-bold text-lg md:text-xl text-brand-text">
                      Orientação ética, sem alarmismo e com foco no bem-estar
                    </h3>
                    <p className="text-xs text-brand-text-muted max-w-xl">
                      A plataforma nunca substitui a consulta presencial, mas capacita você a tomar as melhores decisões para o seu companheiro com serenidade.
                    </p>
                  </div>

                  <a
                    href="#planos"
                    className="px-7 py-3.5 rounded-full bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-md shrink-0 flex items-center gap-2 scale-100 hover:scale-[1.03]"
                  >
                    <span>Começar com o Plano Essencial</span>
                    <PawPrint className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}

            {/* VERSÃO 2: MODO COMPARATIVO VETPRO VS GOOGLE */}
            {advantagesMode === 'comparison' && (
              <div>
                <div className="text-center max-w-[760px] mx-auto mb-16">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider mb-3.5 shadow-sm">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Comparativo Direto
                  </div>
                  <h2 className="font-display text-[32px] md:text-[40px] font-bold tracking-tight mb-4">
                    VetPro Orienta <span className="text-brand-text-muted font-normal">vs.</span> Busca no <span className="font-display font-extrabold tracking-tight inline-flex items-baseline"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
                  </h2>
                  <p className="text-brand-text-muted text-[15px] md:text-[16px] leading-relaxed">
                    Pesquisar sinais clínicos soltos em buscadores genéricos expõe o tutor a receitas caseiras perigosas, diagnósticos alarmistas e perda de tempo crítico. Entenda as diferenças fundamentais:
                  </p>
                </div>

                {/* Cards Lado a Lado */}
                <div className="grid lg:grid-cols-2 gap-8 mb-12">
                  
                  {/* LADO 1: Busca Genérica no Google */}
                  <div className="rounded-[24px] p-7 md:p-8 bg-brand-surface/80 border-2 border-red-500/30 shadow-xl shadow-red-500/5 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-[#4285F4]/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#EA4335]/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div>
                      {/* Header do Card Google com Logo Oficial */}
                      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-brand-border-strong">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-white shadow-md border border-zinc-200 flex items-center justify-center font-bold text-lg">
                            <span className="font-display font-bold text-[#4285F4]">G</span>
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-lg text-brand-text flex items-center gap-1.5">
                              Busca no <span className="font-extrabold tracking-tight"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
                            </h3>
                            <p className="text-[11px] text-red-400 font-medium">Algoritmo genérico, automedicação e pânico</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                          Alto Risco
                        </span>
                      </div>

                      {/* Mockup Visual com a Cara Autêntica do Google Search */}
                      <div className="rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-4 mb-6 text-xs space-y-3">
                        
                        {/* Barra de Endereço do Navegador */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-[11px] text-zinc-400 font-mono">
                          <span className="text-zinc-500">🔒</span>
                          <span className="text-zinc-300">google.com.br</span>
                          <span className="text-zinc-500 truncate">/search?q=meu+cachorro+vomitou+amarelo+e+esta+tremendo</span>
                        </div>

                        {/* Logo Google Mini e Barra de Pesquisa Estilo Google */}
                        <div className="bg-white rounded-2xl p-3.5 shadow-md border border-zinc-200 space-y-2.5 text-zinc-800">
                          <div className="flex items-center justify-center gap-1 pb-1">
                            <span className="font-display font-bold text-base tracking-tight select-none">
                              <span className="text-[#4285F4]">G</span>
                              <span className="text-[#EA4335]">o</span>
                              <span className="text-[#FBBC05]">o</span>
                              <span className="text-[#4285F4]">g</span>
                              <span className="text-[#34A853]">l</span>
                              <span className="text-[#EA4335]">e</span>
                            </span>
                          </div>

                          {/* Google Search Bar com microfone e lens */}
                          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-full bg-zinc-50 border border-zinc-300 shadow-inner text-zinc-700">
                            <div className="flex items-center gap-2 truncate">
                              <Search className="w-3.5 h-3.5 text-[#9AA0A6] shrink-0" />
                              <span className="text-[11px] font-medium truncate text-zinc-800">&quot;meu cachorro vomitou amarelo e está tremendo&quot;</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <div className="w-4 h-4 rounded-full flex items-center justify-center" title="Pesquisa por voz Google">
                                <span className="text-[10px]">🎙️</span>
                              </div>
                              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]" title="Google Lens">
                                <span className="text-[#4285F4] font-bold">📷</span>
                              </div>
                            </div>
                          </div>

                          {/* Botões clássicos de pesquisa do Google */}
                          <div className="flex items-center justify-center gap-2 pt-1">
                            <span className="px-2.5 py-1 rounded bg-[#f8f9fa] border border-[#dadce0] text-[#3c4043] text-[10px] font-medium shadow-2xs">
                              Pesquisa Google
                            </span>
                            <span className="px-2.5 py-1 rounded bg-[#f8f9fa] border border-[#dadce0] text-[#3c4043] text-[10px] font-medium shadow-2xs">
                              Estou com sorte
                            </span>
                          </div>
                        </div>

                        {/* Resultados Simulados de Busca do Google */}
                        <div className="space-y-2">
                          <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-[11px] leading-snug">
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mb-0.5 truncate">
                              <span className="text-zinc-500">https://forum-pets-livre.com</span> › posts › duvida-8492
                            </div>
                            <div className="font-bold text-[#8ab4f8] hover:underline cursor-pointer text-xs mb-1 flex items-center gap-1">
                              Remédios caseiros para vômito em cães: o que dar em casa?
                            </div>
                            <p className="text-[11px] text-zinc-300">
                              &quot;...para induzir vômito rápido, dê 1 colher de água oxigenada 10 volumes ou azeite de cozinha no fundo da garganta...&quot;
                            </p>
                            <div className="mt-1.5 p-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-[10px] font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                              <span>PERIGO REAL: Causa gastrite química ulcerativa, pneumonia aspirativa e intoxicação letal.</span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-[11px] leading-snug">
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-mono mb-0.5 truncate">
                              <span className="text-zinc-500">https://blog-animais-urgente.org</span> › saude-canina
                            </div>
                            <div className="font-bold text-[#8ab4f8] hover:underline cursor-pointer text-xs mb-0.5">
                              Tremores em cães: 45 possíveis causas graves e terminais
                            </div>
                            <p className="text-[10.5px] text-zinc-400">
                              &quot;Tremores podem indicar cinomose fatal, tumor cerebral ou falência hepática (sem saber o peso, a raça, se tomou vacinas ou se comeu veneno)...&quot;
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Lista de Desvantagens */}
                      <ul className="space-y-3.5 text-xs text-brand-text-muted">
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Zero Contexto Clínico do Animal:</strong> O Google não sabe o peso exato, espécie (cão ou gato), raça, idade ou histórico de vacinas e alergias.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Risco Fatal de Automedicação:</strong> Medicamentos humanos comuns (como paracetamol, diclofenaco ou dipirona em doses erradas) são letais para pets.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Alarmismo & Pânico Psicológico:</strong> Apresenta diagnósticos catastróficos que desesperam a família sem nenhuma conduta prática.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Busca Estática e Passiva:</strong> Ninguém faz perguntas de retorno para checar se a gengiva está branca, se há febre ou dor abdominal.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 mt-0.5">
                            <XCircle className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Perda de Tempo Fatal:</strong> Em casos de torção gástrica, obstrução ou choque, horas gastas na web reduzem a chance de sobrevivência.
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* LADO 2: VetPro Orienta */}
                  <div className="rounded-[24px] p-7 md:p-8 bg-gradient-to-b from-brand-surface to-brand-surface-2 border border-brand-teal/40 shadow-2xl shadow-brand-teal/10 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div>
                      {/* Header do Card VetPro */}
                      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-brand-border-strong">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center font-bold">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-lg text-brand-text flex items-center gap-2">
                              Teleorientação VetPro Orienta
                            </h3>
                            <p className="text-[11px] text-brand-teal font-medium">Anamnese ativa, base veterinária e ética</p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-brand-teal/20 text-brand-teal border border-brand-teal/40 text-[10px] font-extrabold uppercase tracking-wider">
                          Recomendado
                        </span>
                      </div>

                      {/* Mockup Visual de Chat VetPro */}
                      <div className="rounded-xl bg-brand-bg/90 border border-brand-teal/30 p-3.5 mb-6 text-xs space-y-2.5">
                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-[11px] font-semibold">
                          <span className="flex items-center gap-1.5">
                            <PawPrint className="w-3.5 h-3.5" /> Prontuário: Thor • Golden Retriever
                          </span>
                          <span className="text-[10px] text-brand-text-muted">3 anos • 32 kg</span>
                        </div>
                        <div className="p-3 rounded-lg bg-brand-surface border border-brand-border-strong text-brand-text text-[11px] leading-relaxed">
                          <div className="flex items-center gap-1.5 font-bold text-brand-teal mb-1">
                            <BrainCircuit className="w-3.5 h-3.5" /> Anamnese Ativa & Complementar:
                          </div>
                          &quot;Identifiquei o vômito amarelado no Thor (32kg). Como ele é jovem e de porte grande, preciso saber: 
                          <br /><b>1.</b> Ele teve acesso a lixo, ossos ou plantas tóxicas?
                          <br /><b>2.</b> A gengiva dele está rosada ou pálida/esbranquiçada?
                          <br /><b>3.</b> O abdômen parece rígido ou com dor ao toque?&quot;
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-brand-teal font-medium px-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                          Base médica estruturada • Alerta ético de atendimento presencial imediato
                        </div>
                      </div>

                      {/* Lista de Vantagens */}
                      <ul className="space-y-3.5 text-xs text-brand-text-muted">
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Anamnese Ativa & Direcionada:</strong> A IA conduz uma conversa interativa fazendo perguntas direcionadas para afunilar a queixa e complementar a avaliação.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Prontuário Individualizado:</strong> Todas as orientações respeitam espécie, raça, idade, peso exato e histórico de saúde cadastrado no perfil do seu pet.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Suporte a Envio de Exames & Fotos:</strong> Permite anexar laudos de exames laboratoriais, de imagem e fotos de sinais clínicos para enriquecer a triagem.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">Base Médica-Veterinária Estruturada:</strong> Conteúdos revisados dentro da medicina veterinária com foco estrito em segurança e prevenção de automedicação.
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <strong className="text-brand-text font-semibold">GPS para Hospitais 24h & Pronto-Socorro:</strong> Em caso de urgência, fornece a rota mais rápida no Google Maps e contato para checar plantão.
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>

                </div>

                {/* Tabela Resumo Rápida de Comparação */}
                <div className="bg-brand-surface rounded-[20px] border border-brand-border-strong p-6 md:p-8 overflow-x-auto">
                  <div className="flex items-center gap-2 mb-6">
                    <Sparkles className="w-5 h-5 text-brand-teal" />
                    <h3 className="font-display font-bold text-base md:text-lg text-brand-text">
                      Quadro Comparativo: Critérios de Decisão Clínica
                    </h3>
                  </div>

                  <div className="min-w-[620px] divide-y divide-brand-border-strong text-xs">
                    <div className="grid grid-cols-12 pb-3 font-bold text-brand-text-muted uppercase tracking-wider text-[11px]">
                      <div className="col-span-4">Critério de Avaliação</div>
                      <div className="col-span-4 text-red-400 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" /> Busca no <span className="font-extrabold tracking-tight inline-flex items-baseline"><span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span></span>
                      </div>
                      <div className="col-span-4 text-brand-teal flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> VetPro Orienta
                      </div>
                    </div>

                    <div className="grid grid-cols-12 py-3.5 items-center">
                      <div className="col-span-4 font-semibold text-brand-text">Contexto e Prontuário do Pet</div>
                      <div className="col-span-4 text-brand-text-muted">Nenhum. Respostas genéricas para a web inteira.</div>
                      <div className="col-span-4 text-brand-text font-medium flex items-center gap-1.5 text-brand-teal">
                        <Check className="w-4 h-4 shrink-0" /> Prontuário com peso, raça, idade e histórico.
                      </div>
                    </div>

                    <div className="grid grid-cols-12 py-3.5 items-center">
                      <div className="col-span-4 font-semibold text-brand-text">Interatividade na Anamnese</div>
                      <div className="col-span-4 text-brand-text-muted">Passiva. Tutor lê dezenas de links divergentes.</div>
                      <div className="col-span-4 text-brand-text font-medium flex items-center gap-1.5 text-brand-teal">
                        <Check className="w-4 h-4 shrink-0" /> Conversa ativa com perguntas direcionadas.
                      </div>
                    </div>

                    <div className="grid grid-cols-12 py-3.5 items-center">
                      <div className="col-span-4 font-semibold text-brand-text">Leitura de Exames e Fotos</div>
                      <div className="col-span-4 text-brand-text-muted">Não analisa arquivos ou laudos clínicos.</div>
                      <div className="col-span-4 text-brand-text font-medium flex items-center gap-1.5 text-brand-teal">
                        <Check className="w-4 h-4 shrink-0" /> Interpretação de laudos e fotos para triagem.
                      </div>
                    </div>

                    <div className="grid grid-cols-12 py-3.5 items-center">
                      <div className="col-span-4 font-semibold text-brand-text">Segurança contra Automedicação</div>
                      <div className="col-span-4 text-brand-text-muted">Alto risco de receitas caseiras e doses tóxicas.</div>
                      <div className="col-span-4 text-brand-text font-medium flex items-center gap-1.5 text-brand-teal">
                        <Check className="w-4 h-4 shrink-0" /> Bloqueio de automedicação e alerta ético.
                      </div>
                    </div>

                    <div className="grid grid-cols-12 py-3.5 items-center">
                      <div className="col-span-4 font-semibold text-brand-text">Encaminhamento para Emergências</div>
                      <div className="col-span-4 text-brand-text-muted">Anúncios genéricos sem checagem de proximidade.</div>
                      <div className="col-span-4 text-brand-text font-medium flex items-center gap-1.5 text-brand-teal">
                        <Check className="w-4 h-4 shrink-0" /> Hospitais 24h com rotas GPS no Google Maps.
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-brand-border-strong flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-brand-text-muted text-center sm:text-left">
                      Proteja quem você mais ama com orientação séria e responsável, por apenas <strong className="text-brand-text">R$ 9,90/mês</strong>.
                    </p>
                    <a
                      href="#planos"
                      className="px-6 py-3 rounded-full bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-md shrink-0 flex items-center gap-2"
                    >
                      <span>Assinar Plano com Segurança</span>
                      <PawPrint className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* Dobra: Para Quem É */}
      <section id="para-quem" className="py-24 relative overflow-hidden">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="text-center max-w-[680px] mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider mb-3">
              Público-Alvo
            </div>
            <h2 className="font-display text-[32px] md:text-[38px] font-bold tracking-tight mb-4">
              Para quem é a VetPro Orienta?
            </h2>
            <p className="text-brand-text-muted text-[15px] leading-relaxed">
              Criada para tutores que amam seus animais e buscam respostas rápidas, acolhimento confiável e segurança contra a automedicação ou desinformação.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {targetAudiences.map((item, index) => {
              const IconComp = item.icon;
              return (
                <div 
                  key={index}
                  className="bg-brand-surface border border-brand-border-strong rounded-[22px] p-6 hover:border-brand-teal/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 text-brand-teal flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-bold text-base text-brand-text mb-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-brand-text-muted leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Dobra: Serviços de Localização e Guia de Parceiros na Área do Tutor */}
      <section id="parceiros" className="py-20 relative overflow-hidden bg-brand-surface/20 border-t border-brand-border-strong">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="text-center max-w-[680px] mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider mb-3">
              <Navigation className="w-3.5 h-3.5" /> Geolocalização Integrada
            </div>
            <h2 className="font-display text-[32px] md:text-[38px] font-bold tracking-tight mb-4">
              Localização Inteligente de Hospitais 24h e Clínicas
            </h2>
            <p className="text-brand-text-muted text-[15px] leading-relaxed">
              O sistema localiza em tempo real pelo Google Maps os estabelecimentos de saúde animal mais próximos do seu endereço para você nunca ficar desamparado em momentos de emergência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-brand-surface/60 border border-brand-border-strong flex flex-col items-start hover:border-brand-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
                <Activity className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Hospitais & Pronto-Socorro 24h</h3>
              <p className="text-brand-text-muted text-sm leading-relaxed">
                Localização de hospitais e pronto-socorros veterinários 24 horas próximos da sua região, com direcionamento para a melhor rota pelo Google Maps e disponibilização do contato telefônico do estabelecimento para checagem de plantão.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface/60 border border-brand-border-strong flex flex-col items-start hover:border-brand-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Clínicas e Especialistas</h3>
              <p className="text-brand-text-muted text-sm leading-relaxed">
                Filtre por dermatologia, cardiologia, oftalmologia e cirurgia, visualizando avaliações reais e horários de funcionamento.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-brand-surface/60 border border-brand-border-strong flex flex-col items-start hover:border-brand-primary/40 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2">Farmácias & Pet Shops</h3>
              <p className="text-brand-text-muted text-sm leading-relaxed">
                Encontre farmácias de manipulação veterinária e pet shops na sua proximidade com rotas e canais diretos de contato.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-24 bg-brand-surface/30 border-y border-brand-border-strong">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="text-center max-w-[620px] mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/15 text-brand-accent-2 text-xs font-bold uppercase tracking-wider mb-3">
              Planos Transparentes
            </div>
            <h2 className="font-display text-[32px] md:text-[38px] font-bold tracking-tight mb-3">
              Orientação Veterinária Acessível
            </h2>
            <p className="text-brand-text-muted text-[15px]">
              Assine com facilidade, sem contratos longos ou multas. Gestão de cobrança automática e segura pelo banco Asaas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {dynamicPlans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative rounded-[24px] p-7 md:p-8 border flex flex-col justify-between transition-all ${
                  plan.is_coming_soon
                    ? 'bg-brand-surface/80 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : plan.is_popular 
                      ? 'bg-gradient-to-b from-brand-surface to-brand-surface-2 border-brand-accent shadow-2xl shadow-brand-accent/10 ring-1 ring-brand-accent/30' 
                      : 'bg-brand-surface border-brand-border-strong'
                }`}
              >
                {/* Badges no topo */}
                <div className="absolute -top-3.5 right-6 flex items-center gap-2">
                  {plan.is_coming_soon && (
                    <div className="bg-amber-500 text-brand-bg text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      EM BREVE
                    </div>
                  )}
                  {plan.is_popular && !plan.is_coming_soon && (
                    <div className="bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Mais Vendido
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                  </div>
                  <p className="text-xs text-brand-text-muted mb-4 leading-relaxed">{plan.desc}</p>
                  
                  {plan.comparison_badge && (
                    <div className="mb-4 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{plan.comparison_badge}</span>
                    </div>
                  )}

                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-xs font-semibold text-brand-text-muted">R$</span>
                    <span className="font-display text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-xs text-brand-text-muted">{plan.period}</span>
                  </div>

                  {plan.billing_cycle === 'YEARLY' && (
                    <div className="text-[11px] text-brand-teal font-semibold font-mono mb-6 pb-4 border-b border-brand-border-strong flex items-center gap-1">
                      <span>Equivale a apenas <strong>R$ 4,99/mês</strong></span>
                    </div>
                  )}
                  {plan.billing_cycle !== 'YEARLY' && (
                    <div className="text-[11px] text-brand-text-muted mb-6 pb-4 border-b border-brand-border-strong">
                      <span>Cobrança mensal recorrente sem carência</span>
                    </div>
                  )}

                  <ul className="space-y-3.5 mb-8 text-xs text-brand-text">
                    {plan.features.map((feat: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        {feat.hasLock || plan.is_coming_soon ? (
                          <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-sm mt-0.5">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                          </div>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                        )}
                        <span className={`flex items-center gap-1.5 flex-wrap leading-tight ${feat.strong ? 'font-bold text-brand-teal' : ''}`}>
                          {feat.text}
                          {feat.hasLock && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1">
                              <Lock className="w-2.5 h-2.5" /> Exclusivo
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Botão do Plano: desabilitado e com indicação EM BREVE se is_coming_soon */}
                {plan.is_coming_soon ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 rounded-full font-display font-bold text-xs bg-brand-surface-2 border border-amber-500/40 text-amber-300/80 cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>EM BREVE — Indisponível no Momento</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenModal(plan.id)}
                    className={`w-full py-3.5 rounded-full font-display font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${
                      plan.is_popular
                        ? 'bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink hover:opacity-95 shadow-brand-accent/25'
                        : 'bg-brand-surface-2 hover:bg-brand-surface-2/80 text-brand-text border border-brand-border-strong hover:border-brand-teal'
                    }`}
                  >
                    Assinar {plan.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Banner de Responsabilidade Médica-Veterinária (Obrigatório / Ético) */}
      <section className="py-14 bg-brand-bg">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="p-8 md:p-10 rounded-[24px] bg-gradient-to-r from-brand-surface to-brand-surface-2 border border-brand-teal/30 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-teal/20 text-brand-teal flex items-center justify-center shrink-0 mt-1">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div className="space-y-2 max-w-3xl">
                <h3 className="font-display font-bold text-lg text-brand-text flex items-center gap-2">
                  <span>Compromisso com a Saúde e Ética Veterinária</span>
                </h3>
                <p className="text-xs md:text-[13px] text-brand-text-muted leading-relaxed">
                  Para uma orientação mais precisa, procure sempre um <strong>médico-veterinário presencial de sua confiança</strong>. A orientação técnica por inteligência artificial é uma ferramenta de apoio informativo e triagem preliminar, e <strong>não substitui a consulta física, o exame detalhado e o diagnóstico de um profissional médico-veterinário habilitado</strong>.
                </p>
              </div>
            </div>

            <div className="px-5 py-2.5 rounded-full bg-brand-surface-2 border border-brand-border-strong text-brand-text-muted text-xs font-bold flex items-center gap-2 shrink-0 cursor-default opacity-85">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>Atendimento com Especialista (Em Breve)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Faq de Dúvidas */}
      <section id="faq" className="py-24 bg-brand-surface/20 border-t border-brand-border-strong">
        <div className="max-w-[860px] mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-3.5 h-3.5" /> Dúvidas Frequentes
            </div>
            <h2 className="font-display text-[32px] md:text-[38px] font-bold tracking-tight mb-3">
              Perguntas Frequentes sobre a VetPro Orienta
            </h2>
            <p className="text-brand-text-muted text-[15px]">
              Tudo o que você precisa saber sobre o funcionamento das orientações, planos e regras.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div 
                  key={index}
                  className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 md:p-6 text-left flex items-center justify-between gap-4 hover:bg-brand-surface-2/40 transition-colors"
                  >
                    <span className="font-display font-bold text-sm md:text-base text-brand-text">
                      {faq.question}
                    </span>
                    <span className={`w-8 h-8 rounded-full bg-brand-surface-2 flex items-center justify-center text-brand-teal shrink-0 transition-transform ${isOpen ? 'rotate-180 bg-brand-teal/15' : ''}`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-6 md:px-6 md:pb-6 text-xs md:text-[13px] text-brand-text-muted leading-relaxed border-t border-brand-border-strong/50 pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal de Cadastro e Assinatura */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-brand-surface border border-brand-border-strong rounded-[24px] p-7 md:p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 p-1 text-brand-text-muted hover:text-brand-text rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs text-brand-teal font-bold mb-1">
                <Lock className="w-3.5 h-3.5" /> Cadastro Seguro via Asaas
              </div>
              <h3 className="font-display text-xl font-bold">
                Assinar {dynamicPlans.find(p => p.id === selectedPlan)?.name || 'Plano'} (R$ {dynamicPlans.find(p => p.id === selectedPlan)?.price || '9,90'}{dynamicPlans.find(p => p.id === selectedPlan)?.period || '/mês'})
              </h3>
              <p className="text-xs text-brand-text-muted mt-1">
                Informe seus dados para cadastro do cliente e geração da assinatura.
              </p>
            </div>

            {submitError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-brand-text-muted mb-1">Nome Completo *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Seu nome completo"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-brand-text-muted mb-1">CPF ou CNPJ *</label>
                <input
                  type="text"
                  name="cpfCnpj"
                  required
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-brand-text-muted mb-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-brand-text-muted mb-1">WhatsApp com DDD *</label>
                <input
                  type="tel"
                  name="whatsapp"
                  required
                  placeholder="(11) 99999-9999"
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink font-display font-bold text-xs hover:opacity-95 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cadastrando e Gerando Assinatura no Asaas...
                    </>
                  ) : (
                    'Concluir Cadastro e Ativar Assinatura'
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-brand-text-muted leading-relaxed">
                Ao cadastrar-se, você declara estar ciente dos nossos{' '}
                <Link href="/termos-de-uso" target="_blank" className="text-brand-teal hover:underline font-semibold">
                  Termos de Uso
                </Link>{' '}
                e da nossa{' '}
                <Link href="/politica-de-privacidade" target="_blank" className="text-brand-teal hover:underline font-semibold">
                  Política de Privacidade (LGPD)
                </Link>.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-brand-border-strong py-12 bg-brand-bg">
        <div className="max-w-[1140px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-brand-text-muted">
          <div className="flex items-center gap-2 font-display font-bold text-brand-text">
            <span>🐾 VetPro Orienta</span>
          </div>
          <p>© 2026 VetPro Orienta. Todos os direitos reservados. Conformidade LGPD & Asaas.</p>
          <div className="flex flex-wrap items-center gap-4 justify-center">
            <Link href="/politica-de-privacidade" className="hover:text-brand-text transition-colors">
              Privacidade & LGPD
            </Link>
            <Link href="/termos-de-uso" className="hover:text-brand-text transition-colors">
              Termos de Uso
            </Link>
            <Link href="/login" className="hover:text-brand-text transition-colors">
              Área Restrita
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

