'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, FileText, CheckCircle2, AlertCircle, Smartphone } from 'lucide-react';
import { triggerPWAInstallModal } from '@/components/PwaInstallPrompt';

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex flex-col">
      {/* Header */}
      <header className="border-b border-brand-border-strong bg-brand-surface/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-display font-bold text-base hover:opacity-90 transition-opacity">
            <span className="w-8 h-8 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center text-sm border border-brand-teal/30">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Orienta</b></span>
          </Link>

          <div className="flex items-center gap-3">
            <button
              onClick={triggerPWAInstallModal}
              className="px-3 py-1.5 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-xs font-bold transition-all hidden sm:flex items-center gap-1.5"
            >
              📱 Baixar App
            </button>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-semibold text-brand-text-muted hover:text-brand-text transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Início
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-brand-border-strong bg-gradient-to-b from-brand-surface to-brand-bg py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-teal/15 border border-brand-teal/30 text-brand-teal text-xs font-bold">
            <FileText className="w-4 h-4" />
            <span>Condições Gerais de Contratação e Uso</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-display font-bold text-brand-text">
            Termos de Uso do Serviço
          </h1>
          <p className="text-xs sm:text-sm text-brand-text-muted max-w-2xl mx-auto leading-relaxed">
            Regras, limites de responsabilidade e orientações para utilização dos serviços de orientação veterinária e triagem por inteligência artificial.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6 text-xs sm:text-sm text-brand-text-muted leading-relaxed">
        
        {/* Aviso Crucial */}
        <div className="p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 space-y-2">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            1. Natureza Informativa e Limitações da Triagem por IA
          </h3>
          <p>
            A <b>VetPro Orienta</b> fornece ferramentas tecnológicas de triagem prévia, apoio à decisão e suporte informativo para tutores de cães e gatos. 
            <b> O serviço NÃO substitui a consulta clínica presencial, o exame físico nem o diagnóstico definitivo realizado por um médico-veterinário legalmente habilitado no CRMV.</b>
          </p>
          <p>
            Em hipótese alguma a plataforma realiza prescrição automatizada de fármacos restritos ou controlados sem a devida intervenção e responsabilidade técnica profissional.
          </p>
        </div>

        {/* 2. Assinatura e Pagamentos */}
        <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
          <h3 className="text-base font-bold text-brand-text font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-bold">2</span>
            Planos de Assinatura, Faturamento e Cancelamento
          </h3>
          <ul className="list-disc pl-5 space-y-2 text-xs">
            <li>
              <b className="text-brand-text">Cobrança Recorrente Mensal:</b> As mensalidades são processadas de forma segura via gateway financeiro parceiro (Asaas) através de Pix, Cartão de Crédito ou Boleto.
            </li>
            <li>
              <b className="text-brand-text">Sem Carência ou Fidelidade:</b> O tutor pode solicitar o cancelamento da recorrência a qualquer momento pelo painel ou suporte sem incidência de multas rescisórias.
            </li>
            <li>
              <b className="text-brand-text">Liberação de Acesso:</b> O acesso aos módulos de Triagem e Carteirinha Pet é desbloqueado após a compensação da fatura pelo sistema bancário.
            </li>
          </ul>
        </section>

        {/* 3. Responsabilidades do Tutor */}
        <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
          <h3 className="text-base font-bold text-brand-text font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-bold">3</span>
            Deveres do Usuário / Tutor
          </h3>
          <p>
            O tutor compromete-se a fornecer informações verídicas e atualizadas quanto ao estado de saúde do animal, raça, idade e sintomas observados, e compreende que em situações agudas de risco de morte (urgência/emergência), o animal deve ser imediatamente conduzido a uma unidade hospitalar veterinária 24 horas.
          </p>
        </section>

        {/* 4. Propriedade Intelectual & PWA */}
        <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
          <h3 className="text-base font-bold text-brand-text font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-bold">4</span>
            Propriedade Intelectual e Uso do Aplicativo (PWA)
          </h3>
          <p>
            Todo o código-fonte, algoritmos de triagem, marcas, logotipos e interfaces da VetPro Orienta são de propriedade exclusiva de seus desenvolvedores. A instalação do aplicativo via Progressive Web App (PWA) concede ao usuário uma licença de uso pessoal, intransferível e não exclusiva durante a vigência de seu plano.
          </p>
        </section>

        {/* 5. Foro e Legislação */}
        <section className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
          <h3 className="text-base font-bold text-brand-text font-display flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand-teal/15 text-brand-teal flex items-center justify-center text-xs font-bold">5</span>
            Foro e Legislação Aplicável
          </h3>
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil, em especial o Código de Defesa do Consumidor (Lei 8.078/1990), o Marco Civil da Internet (Lei 12.965/2014) e a LGPD (Lei 13.709/2018).
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-brand-border-strong py-8 bg-brand-surface/50 text-xs text-brand-text-muted">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 VetPro Orienta. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/termos-de-uso" className="text-brand-teal font-semibold">Termos de Uso</Link>
            <Link href="/politica-de-privacidade" className="hover:text-brand-text">Política de Privacidade (LGPD)</Link>
            <Link href="/" className="hover:text-brand-text">Página Inicial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
