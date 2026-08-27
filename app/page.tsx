'use client';

import Link from 'next/link';
import { PawPrint, CheckCircle2, Video, Heart, Shield, HelpCircle, MessageCircle, X, Clock, Smartphone, Star, Search, FileText, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function LandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');

  const plans = [
    {
      id: "essencial",
      name: "Essencial",
      desc: "Orientação por chat com a nossa equipe",
      price: "9,90",
      period: "/mês",
      highlight: false,
      features: [
        { text: "Chat com a equipe VetPro Orienta", strong: false },
        { text: "Envio de fotos, vídeos e exames", strong: false },
        { text: "Respostas em até 24h", strong: false },
        { text: "Cancele quando quiser", strong: false }
      ]
    },
    {
      id: "especialista",
      name: "Especialista",
      desc: "Com atendimento humano especializado",
      price: "29,90",
      period: "/mês",
      highlight: true,
      features: [
        { text: "Tudo do plano Essencial", strong: false },
        { text: "Atendimento humano especializado com médico-veterinário", strong: true },
        { text: "Prioridade nas respostas", strong: false },
        { text: "Cancele quando quiser", strong: false }
      ]
    }
  ];

  const handleOpenModal = (planId: string) => {
    setSelectedPlan(planId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const planName = plans.find(p => p.id === selectedPlan)?.name || 'Essencial';
    
    // Na vida real enviaria para o webhook aqui.
    // Redirecionando para a página de obrigado (que simula a continuação)
    window.location.href = `/obrigado?nome=${encodeURIComponent(name)}&plano=${encodeURIComponent(planName)}`;
  };

  return (
    <div className="min-h-screen relative font-body selection:bg-brand-teal/30 selection:text-brand-text">
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/10 via-brand-bg to-brand-bg h-[600px]" />
      
      {/* Header */}
      <header className="sticky top-0 z-40 bg-brand-bg/85 backdrop-blur-md border-b border-brand-border">
        <div className="max-w-6xl mx-auto px-6 h-[76px] flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display font-bold text-[19px]">
            <span className="w-[34px] h-[34px] rounded-xl bg-brand-accent/15 flex items-center justify-center text-[17px]">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Orienta</b></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-brand-teal transition-colors">
              Área do Tutor
            </Link>
            <button 
              onClick={() => handleOpenModal('essencial')}
              className="bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink px-[18px] py-[11px] rounded-full font-display font-semibold text-[13.5px] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(34,197,94,0.65)] transition-all"
            >
              Quero conhecer
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-16 px-6 relative border-b border-brand-border-strong overflow-hidden">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[0.85fr_1.15fr] gap-12 items-end">
          <div className="pb-20">
            <span className="font-display text-[12.5px] font-semibold tracking-wider uppercase text-brand-teal flex items-center gap-2 mb-4">
              🐾 Orientação veterinária online
            </span>
            <h1 className="font-display text-4xl md:text-[44px] leading-[1.14] font-bold mb-6 tracking-tight">
              A saúde do seu pet <span className="text-brand-teal">na palma da sua mão.</span>
            </h1>
            <p className="text-brand-text-muted text-[16.5px] mb-8 max-w-[48ch]">
              Esqueça o desespero de pesquisar sintomas no Google. Converse com especialistas, envie fotos e vídeos, e tenha orientação confiável de onde estiver, na hora que precisar.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <button 
                onClick={() => handleOpenModal('essencial')}
                className="w-full sm:w-auto bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink px-[26px] py-[15px] rounded-full font-display font-semibold text-[15px] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-10px_rgba(34,197,94,0.65)] transition-all flex items-center justify-center gap-2"
              >
                Quero conhecer o VetPro
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4"><path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="flex items-center gap-3 text-sm text-brand-text-muted">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-brand-surface-2 border-2 border-brand-bg flex items-center justify-center text-[10px]">👩</div>
                  <div className="w-8 h-8 rounded-full bg-brand-surface-2 border-2 border-brand-bg flex items-center justify-center text-[10px]">🧔</div>
                  <div className="w-8 h-8 rounded-full bg-brand-surface-2 border-2 border-brand-bg flex items-center justify-center text-[10px]">👱‍♀️</div>
                </div>
                <div className="flex flex-col">
                  <div className="flex text-brand-accent-2">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                  <span className="text-[11px] mt-0.5 font-medium">Tutores tranquilos</span>
                </div>
              </div>
            </div>
          </div>
          <div className="relative w-full flex items-end justify-center md:justify-end md:-mr-12 -mb-[1px]">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src="https://oeobudcffkeqejpxpenf.supabase.co/storage/v1/object/public/Imagens/editada_chicao%20(1).png" alt="VetPro Orienta" className="w-[115%] md:w-[130%] max-w-none h-auto object-contain object-bottom drop-shadow-2xl translate-y-[2px]" />
          </div>
        </div>
      </section>

      {/* Persuasive Benefits Section */}
      <section className="py-24 bg-brand-bg-elevated border-y border-brand-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl font-bold mb-4">Por que escolher o VetPro Orienta?</h2>
            <p className="text-brand-text-muted text-[16px] leading-relaxed">
              O Google não conhece o seu pet, e clínicas 24h podem custar caro para tirar uma dúvida simples. Nós unimos a praticidade que você quer com a segurança que o seu melhor amigo precisa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-8 hover:border-brand-teal/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center mb-6 text-brand-teal">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">Praticidade Absoluta</h3>
              <p className="text-[14.5px] text-brand-text-muted leading-relaxed">
                Tire dúvidas diretamente pelo seu celular. Chega de trânsito ou estresse na sala de espera para resolver questões simples de manejo, pele ou alimentação.
              </p>
            </div>
            {/* Card 2 */}
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-8 hover:border-brand-teal/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-6 text-brand-accent-2">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">Diga adeus ao "Dr. Google"</h3>
              <p className="text-[14.5px] text-brand-text-muted leading-relaxed">
                Pesquisar sintomas na internet gera pânico desnecessário. Converse com nossa IA treinada e com especialistas reais para ter direcionamentos precisos e seguros.
              </p>
            </div>
            {/* Card 3 */}
            <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-8 hover:border-brand-teal/40 transition-colors">
              <div className="w-12 h-12 rounded-2xl bg-brand-teal/10 flex items-center justify-center mb-6 text-brand-teal">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="font-display text-xl font-bold mb-3">Histórico Organizado</h3>
              <p className="text-[14.5px] text-brand-text-muted leading-relaxed">
                Cada triagem fica salva no perfil do seu pet. Mantenha um prontuário digital completo para consultar ou mostrar ao veterinário presencial quando necessário.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Features */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="font-display text-3xl font-bold mb-6 leading-tight">
                Mais de 1.000 tutores já dormem tranquilos sabendo que têm apoio.
              </h2>
              <div className="flex flex-col gap-6">
                <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-8 shadow-xl">
                  <div className="flex items-center gap-1 mb-4 text-brand-accent-2">
                    <Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" /><Star className="w-4 h-4 fill-current" />
                  </div>
                  <p className="text-[15.5px] text-brand-text-muted italic mb-6 leading-relaxed">
                    "Minha cachorrinha começou a vomitar de madrugada. Usei a triagem e o VetPro Orienta me acalmou na mesma hora, me ensinando o que observar até de manhã. Vale cada centavo pela paz de espírito!"
                  </p>
                  <div className="text-sm font-medium text-brand-text flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-surface-2 flex items-center justify-center">👱‍♀️</div>
                    <div>
                      <div>Mariana Costa</div>
                      <div className="text-xs text-brand-text-muted font-normal">Tutora da Mel 🐶</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-8">
              <div className="flex gap-5 items-start">
                <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center justify-center shrink-0 text-brand-teal shadow-md">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl mb-2">Prevenção salva vidas</h4>
                  <p className="text-brand-text-muted text-[14.5px] leading-relaxed">
                    Saber agir nos primeiros sinais faz toda a diferença para o bem-estar do seu animal e evita gastos altíssimos com urgências de última hora.
                  </p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center justify-center shrink-0 text-brand-teal shadow-md">
                  <Video className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl mb-2">Avaliação rica e visual</h4>
                  <p className="text-brand-text-muted text-[14.5px] leading-relaxed">
                    Mostre exatamente o que está acontecendo enviando fotos de feridas, fezes, ou vídeos de comportamentos estranhos direto pelo chat para uma análise mais precisa.
                  </p>
                </div>
              </div>
              <div className="flex gap-5 items-start">
                <div className="w-14 h-14 rounded-2xl bg-brand-surface border border-brand-border-strong flex items-center justify-center shrink-0 text-brand-teal shadow-md">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-xl mb-2">Economia de tempo (e dinheiro)</h4>
                  <p className="text-brand-text-muted text-[14.5px] leading-relaxed">
                    Muitas idas à clínica poderiam ser evitadas com uma boa orientação prévia. Tenha um veterinário virtual no bolso por menos que uma assinatura de streaming.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-24 px-6" id="planos">
        <div className="max-w-6xl mx-auto">
          <div className="bg-brand-surface border border-brand-border-strong rounded-[22px] p-8 md:p-10 mb-12 flex flex-col md:flex-row gap-10 items-center">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 bg-brand-accent/15 text-brand-accent-2 border border-brand-accent/35 text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
                Lançamento exclusivo
              </span>
              <h3 className="font-display text-2xl font-bold mb-3">Um novo jeito de cuidar de quem você ama.</h3>
              <p className="text-brand-text-muted text-[14.5px]">
                O VetPro Orienta nasceu para estar com você quando a dúvida aparece — trazendo clareza, confiança e o melhor caminho para o seu pet.
              </p>
            </div>
            <div className="md:border-l md:border-brand-border-strong md:pl-10 text-center md:text-left w-full md:w-auto">
              <div className="font-display text-[13px] text-brand-text-muted mb-4">
                Planos a partir de
                <b className="block text-[32px] text-brand-text mt-1">R$ 9,90 <small className="text-sm font-medium text-brand-text-muted">/mês</small></b>
              </div>
              <button 
                onClick={() => handleOpenModal('essencial')}
                className="w-full bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink px-[26px] py-[15px] rounded-full font-display font-semibold text-[15px] hover:-translate-y-0.5 transition-all"
              >
                Quero conhecer
              </button>
            </div>
          </div>

          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-display text-[12.5px] font-semibold tracking-wider uppercase text-brand-teal flex items-center justify-center gap-2 mb-3">
              🐾 Planos
            </span>
            <h2 className="font-display text-3xl font-bold mb-3">Escolha como quer ser cuidado</h2>
            <p className="text-brand-text-muted text-[15.5px]">Dois jeitos de ter o VetPro Orienta ao seu lado.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {plans.map(plan => (
              <div 
                key={plan.id} 
                className={`relative bg-brand-surface border rounded-[22px] p-8 flex flex-col gap-6 transition-all hover:-translate-y-1 ${plan.highlight ? 'border-brand-accent shadow-[0_24px_50px_-26px_rgba(34,197,94,0.4)]' : 'border-brand-border-strong'}`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-6 bg-brand-accent text-brand-accent-ink font-display text-[11px] font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full">
                    Atendimento humano
                  </span>
                )}
                <div>
                  <div className="font-display text-[21px] font-bold">{plan.name}</div>
                  <div className="text-[13.5px] text-brand-text-muted mt-1.5">{plan.desc}</div>
                </div>
                <div className="flex items-baseline gap-1.5 font-display">
                  <span className="text-[15px] text-brand-text-muted font-semibold">R$</span>
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[13px] text-brand-text-muted">{plan.period}</span>
                </div>
                <ul className="flex flex-col gap-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className={`flex gap-2.5 text-sm ${f.strong ? 'text-brand-text font-medium' : 'text-brand-text-muted'}`}>
                      <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handleOpenModal(plan.id)}
                  className={`w-full py-[15px] rounded-full font-display font-semibold text-[15px] transition-all flex items-center justify-center gap-2 ${plan.highlight ? 'bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink hover:-translate-y-0.5' : 'bg-transparent text-brand-text border border-brand-border-strong hover:bg-white/5'}`}
                >
                  Assinar o {plan.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-border text-center text-brand-text-muted text-[13px]">
        <div className="max-w-6xl mx-auto px-6">
          © {new Date().getFullYear()} VetPro Orienta. Todos os direitos reservados.
        </div>
      </footer>

      {/* Floating WA Button */}
      <button 
        onClick={() => handleOpenModal('essencial')}
        className="fixed right-6 bottom-6 z-50 bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink px-5 py-3.5 rounded-full font-display font-bold text-[14.5px] flex items-center gap-2.5 shadow-[0_14px_30px_-10px_rgba(34,197,94,0.6)] hover:-translate-y-1 transition-all"
      >
        <MessageCircle className="w-5 h-5" />
        Falar no WhatsApp
      </button>

      {/* Modal Captura */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-[#040A10]/75 backdrop-blur-sm">
          <div className="relative w-full max-w-[440px] bg-brand-surface border border-brand-border-strong rounded-[22px] p-8 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={handleCloseModal}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-brand-surface-2 flex items-center justify-center text-brand-text-muted hover:text-brand-text transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            {selectedPlan && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-accent-2 bg-brand-accent/15 border border-brand-accent/30 px-3 py-1.5 rounded-full mb-5">
                Plano {plans.find(p => p.id === selectedPlan)?.name}
              </span>
            )}
            
            <h3 className="font-display text-[21px] font-bold mb-2">Vamos começar!</h3>
            <p className="text-brand-text-muted text-[14.5px] mb-6">
              Preencha seus dados abaixo pra gente liberar seu acesso e continuar no WhatsApp.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label htmlFor="name" className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Nome completo</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  required
                  placeholder="Como podemos te chamar?" 
                  className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text px-3.5 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors placeholder:text-brand-text-muted/50 text-[15px]"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">E-mail</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  required
                  placeholder="voce@email.com" 
                  className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text px-3.5 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors placeholder:text-brand-text-muted/50 text-[15px]"
                />
              </div>
              <div>
                <label htmlFor="whatsapp" className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">WhatsApp (com DDD)</label>
                <input 
                  type="tel" 
                  id="whatsapp" 
                  name="whatsapp" 
                  required
                  placeholder="(00) 00000-0000" 
                  className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text px-3.5 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors placeholder:text-brand-text-muted/50 text-[15px]"
                />
              </div>

              <button 
                type="submit" 
                className="w-full mt-2 bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink px-[26px] py-[15px] rounded-full font-display font-semibold text-[15px] hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-10px_rgba(34,197,94,0.55)] transition-all"
              >
                Continuar no WhatsApp
              </button>
              
              <p className="text-[11.5px] text-brand-text-muted text-center mt-2 leading-relaxed">
                Ao continuar, você será redirecionado ao WhatsApp e receberá um e-mail de confirmação com os próximos passos.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
