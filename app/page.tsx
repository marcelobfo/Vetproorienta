'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PawPrint, CheckCircle2, Video, Heart, Shield, HelpCircle, 
  MessageCircle, X, Clock, Smartphone, Star, Search, FileText, 
  AlertCircle, RefreshCw, Lock, Sparkles, ChevronDown, 
  ShieldAlert, Stethoscope, HeartPulse, UserCheck, Baby, Activity, Navigation, Building
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { createAsaasCustomer, createAsaasSubscription, getAsaasConfig } from '@/lib/asaas';
import { PartnerRotativeAds } from '@/components/PartnerRotativeAds';
import { supabase } from '@/lib/supabase';

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

  const [planPrices] = useState(() => {
    const cfg = getAsaasConfig();
    return {
      essencial: cfg.planEssencialPrice || 9.90,
      especialista: cfg.planEspecialistaPrice || 29.90,
    };
  });

  const plans = [
    {
      id: "essencial",
      name: "Essencial",
      desc: "Orientação e triagem técnica rápida com inteligência e suporte",
      price: planPrices.essencial.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      numericPrice: planPrices.essencial,
      period: "/mês",
      highlight: false,
      features: [
        { text: "Orientação e triagem técnica por chat e WhatsApp", strong: false },
        { text: "Envio de fotos, vídeos e resultados de exames", strong: false },
        { text: "Respostas e direcionamento ágil", strong: false },
        { text: "Suporte informativo para o dia a dia", strong: false },
        { text: "Cancele quando quiser, sem carência", strong: false }
      ]
    },
    {
      id: "especialista",
      name: "Especialista",
      desc: "Atendimento humano com médico-veterinário dedicado",
      price: planPrices.especialista.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      numericPrice: planPrices.especialista,
      period: "/mês",
      highlight: true,
      features: [
        { text: "Tudo incluído do plano Essencial", strong: false, hasLock: false },
        { text: "Atendimento humano e especializado com médico-veterinário", strong: true, hasLock: true },
        { text: "Avaliação cuidadosa de exames e histórico clínico", strong: true, hasLock: false },
        { text: "Prioridade máxima de resposta e acompanhamento", strong: false, hasLock: false },
        { text: "Cancele quando quiser, sem fidelidade", strong: false, hasLock: false }
      ]
    }
  ];

  const faqs = [
    {
      question: "A orientação técnica por IA substitui uma consulta com médico-veterinário?",
      answer: "Não. A orientação técnica e os recursos de inteligência artificial são ferramentas de triagem, apoio informativo e acolhimento rápido para dúvidas cotidianas. Para uma orientação mais precisa, diagnóstico clínico definitivo ou prescrição de medicamentos, você deve procurar um médico-veterinário de sua confiança ou assinar o nosso Plano Especialista com médico-veterinário dedicado. A IA nunca substitui a avaliação física presencial de um profissional especializado."
    },
    {
      question: "Como funciona o atendimento no Plano Especialista?",
      answer: "No Plano Especialista, você tem acesso ao atendimento humano com médicos-veterinários. Você pode relatar sintomas, enviar fotos, vídeos do pet e laudos de exames laboratoriais ou de imagem. O profissional analisa o caso individualmente, oferecendo um direcionamento aprofundado, orientações de conduta e recomendações personalizadas."
    },
    {
      question: "O que é a dobra de orientação da VetPro Orienta?",
      answer: "É um serviço de triagem e suporte contínuo para tutores de cães e gatos. Ajudamos a identificar se uma situação requer atendimento hospitalar imediato, tiramos dúvidas sobre vacinação, alimentação, cuidados com filhotes ou pets idosos, prevenindo a automedicação indevida."
    },
    {
      question: "Posso enviar fotos, vídeos e resultados de exames?",
      answer: "Sim! Você pode anexar fotos de lesões ou alterações, vídeos mostrando o comportamento do animal e PDFs ou fotos de exames de sangue e ultrassonografia para enriquecer a orientação."
    },
    {
      question: "Como funciona a assinatura e o pagamento?",
      answer: "A cobrança é mensal e processada de forma 100% segura através do gateway bancário Asaas. Você pode pagar via PIX, Cartão de Crédito ou Boleto Bancário. Não há taxa de adesão, carência ou multas de fidelidade: você pode cancelar a qualquer momento."
    },
    {
      question: "O que devo fazer em casos de emergência grave?",
      answer: "Se o seu pet apresentar sinais graves (dificuldade respiratória aguda, convulsões ativas, sangramento incontrolável, intoxicação recente por venenos ou traumas graves por atropelamento), dirija-se imediatamente a um hospital veterinário 24 horas de sua confiança para atendimento emergencial presencial."
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
      description: "Acompanhamento de exames de rotina, monitoramento de sinais sutis de dor, dúvidas sobre rotina e qualidade de vida na terceira idade."
    },
    {
      icon: Clock,
      title: "Rotina Corrida sem Tempo a Perder",
      description: "Orientação rápida na palma da mão para não perder tempo com desinformação na internet nem deslocamentos desnecessários para dúvidas simples."
    },
    {
      icon: ShieldAlert,
      title: "Quem Quer Evitar Erros e Automedicação",
      description: "Segurança total para nunca oferecer alimentos tóxicos ou medicamentos humanos que colocam a vida do seu animal em risco."
    },
    {
      icon: Stethoscope,
      title: "Triagem Confiável e Acolhedora",
      description: "Entenda se o sintoma é motivo de urgência imediata ou se pode ser monitorado com segurança até a próxima consulta presencial."
    },
    {
      icon: HeartPulse,
      title: "Quem Busca o Melhor para o Pet",
      description: "Acesso a suporte atencioso com opção de plano com especialista humano para uma avaliação técnica ainda mais completa."
    }
  ];

  const handleOpenModal = (planId: string) => {
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

    const planObj = plans.find(p => p.id === selectedPlan) || plans[0];
    setIsSubmitting(true);

    try {
      // Obtém configurações locais de Asaas e Supabase para garantir que o backend utilize as credenciais configuradas
      const localAsaasConfig = getAsaasConfig();
      const localSupabaseUrl = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_url') : '';
      const localSupabaseAnonKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_anon_key') : '';
      const localSupabaseServiceKey = typeof window !== 'undefined' ? localStorage.getItem('vetpro_supabase_service_key') : '';

      // Chama o endpoint unificado de cadastro: cria cliente no Asaas, cria assinatura, cria usuário no banco com senha=CPF e envia WhatsApp com checkout
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
          
          <nav className="hidden md:flex items-center gap-8 text-[14.5px] font-medium text-brand-text-muted">
            <a href="#como-funciona" className="hover:text-brand-text transition-colors">Como funciona</a>
            <a href="#para-quem" className="hover:text-brand-text transition-colors">Para quem é</a>
            <a href="#parceiros" className="hover:text-brand-text transition-colors">Parceiros & GPS</a>
            <a href="#planos" className="hover:text-brand-text transition-colors">Planos</a>
            <a href="#faq" className="hover:text-brand-text transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/login"
              className="text-xs font-semibold px-4 py-2 rounded-full border border-brand-border-strong hover:bg-brand-surface text-brand-text transition-colors"
            >
              Entrar
            </Link>
            <a 
              href="#planos"
              className="bg-brand-teal text-brand-bg px-5 py-2 rounded-full font-display font-semibold text-[13.5px] hover:bg-brand-teal/90 transition-all shadow-sm"
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
              Tire dúvidas do dia a dia, entenda sintomas e receba a melhor recomendação para a saúde do seu cão ou gato, direto no WhatsApp ou no painel.
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
                <strong className="text-brand-text">Aviso ético importante:</strong> A orientação por IA ou triagem não substitui a consulta clínica presencial. Para uma orientação mais precisa, consulte sempre seu médico-veterinário de confiança ou assine nosso plano com especialista.
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
                      <h4 className="text-xs font-bold text-brand-text">Equipe VetPro Ativa</h4>
                      <p className="text-[11px] text-brand-text-muted">Triagem clínica e suporte humanizado</p>
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
          <div className="text-center max-w-[620px] mx-auto mb-14">
            <h2 className="font-display text-[30px] font-bold tracking-tight mb-3">Como Funciona a VetPro Orienta?</h2>
            <p className="text-brand-text-muted text-[15px]">Simples, rápido e no canal que você já usa todo dia.</p>
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
              <h3 className="font-display font-bold text-base mb-2">Descreva a Situação</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Envie suas dúvidas, fotos, vídeos de comportamento ou resultados de exames pelo chat do sistema ou WhatsApp.
              </p>
            </div>

            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center font-display font-bold text-base mb-4">
                3
              </div>
              <h3 className="font-display font-bold text-base mb-2">Receba a Orientação</h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Nossa IA e equipe veterinária especializada avaliam o caso e fornecem o direcionamento ideal para o bem-estar do seu pet.
              </p>
            </div>
          </div>
        </div>
      </section>

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

      {/* Dobra: Rede de Parceiros Credenciados & Anúncios Rotativos */}
      <section id="parceiros" className="py-20 relative overflow-hidden bg-brand-surface/20 border-t border-brand-border-strong">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="text-center max-w-[680px] mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/10 text-brand-teal text-xs font-bold uppercase tracking-wider mb-3">
              <Navigation className="w-3.5 h-3.5" /> Geolocalização & Guia
            </div>
            <h2 className="font-display text-[32px] md:text-[38px] font-bold tracking-tight mb-4">
              Rede de Parceiros & Serviços Mais Próximos
            </h2>
            <p className="text-brand-text-muted text-[15px] leading-relaxed">
              Descubra clínicas 24h, consultórios de especialistas, farmácias veterinárias e pet shops credenciados na sua região com vantagens exclusivas.
            </p>
          </div>

          <PartnerRotativeAds />
        </div>
      </section>

      {/* Planos Section */}
      <section id="planos" className="py-24 bg-brand-surface/30 border-y border-brand-border-strong">
        <div className="max-w-[1140px] mx-auto px-6">
          <div className="text-center max-w-[620px] mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-accent/15 text-brand-accent-2 text-xs font-bold uppercase tracking-wider mb-3">
              Planos Disponíveis
            </div>
            <h2 className="font-display text-[32px] md:text-[38px] font-bold tracking-tight mb-3">
              Planos Transparentes para Todo Tutor
            </h2>
            <p className="text-brand-text-muted text-[15px]">
              Assine com facilidade, sem contratos longos ou multas. Gestão de cobrança automática e segura pelo banco Asaas.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`relative rounded-[24px] p-8 border flex flex-col justify-between transition-all ${
                  plan.highlight 
                    ? 'bg-gradient-to-b from-brand-surface to-brand-surface-2 border-brand-accent shadow-2xl shadow-brand-accent/10' 
                    : 'bg-brand-surface border-brand-border-strong'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 right-6 bg-brand-accent text-brand-accent-ink text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
                    Mais Escolhido
                  </div>
                )}

                <div>
                  <h3 className="font-display text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs text-brand-text-muted mb-6">{plan.desc}</p>
                  
                  <div className="flex items-baseline gap-1 mb-8 pb-6 border-b border-brand-border-strong">
                    <span className="text-xs font-semibold text-brand-text-muted">R$</span>
                    <span className="font-display text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-xs text-brand-text-muted">{plan.period}</span>
                  </div>

                  <ul className="space-y-3.5 mb-8 text-xs text-brand-text">
                    {plan.features.map((feat: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2.5">
                        {feat.hasLock ? (
                          <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/40 shadow-sm">
                            <Lock className="w-2.5 h-2.5 text-amber-400" />
                          </div>
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                        )}
                        <span className={`flex items-center gap-1.5 flex-wrap ${feat.strong ? 'font-bold text-brand-teal' : ''}`}>
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

                <button
                  onClick={() => handleOpenModal(plan.id)}
                  className={`w-full py-3.5 rounded-full font-display font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    plan.highlight
                      ? 'bg-gradient-to-r from-brand-accent-2 to-brand-accent text-brand-accent-ink hover:opacity-95 shadow-lg shadow-brand-accent/20'
                      : 'bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-brand-text'
                  }`}
                >
                  Assinar Plano {plan.name}
                </button>
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
                  Para uma orientação mais precisa, procure sempre um <strong>médico-veterinário presencial de sua confiança</strong> ou assine o nosso plano com o <strong>Especialista</strong>. A orientação técnica por inteligência artificial é uma ferramenta de apoio informativo e triagem preliminar, e <strong>não substitui a consulta física, o exame detalhado e o diagnóstico de um profissional médico-veterinário especializado</strong>.
                </p>
              </div>
            </div>

            <a
              href="#planos"
              className="px-6 py-3 rounded-full bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shrink-0 shadow-md flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Falar com Especialista
            </a>
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
                Assinar Plano {selectedPlan === 'especialista' ? `Especialista (R$ ${planPrices.especialista.toFixed(2).replace('.', ',')}/mês)` : `Essencial (R$ ${planPrices.essencial.toFixed(2).replace('.', ',')}/mês)`}
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

              <p className="text-[11px] text-center text-brand-text-muted">
                Seus dados serão cadastrados no gateway bancário Asaas em ambiente seguro.
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
          <p>© 2026 VetPro Orienta. Todos os direitos reservados. Pagamentos processados via Asaas.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-brand-text">Área Restrita</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

