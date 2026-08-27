'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, MessageCircle, ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

// Wrapper para usar o useSearchParams sem causar erro de build de CSR
function ObrigadoContent() {
  const searchParams = useSearchParams();
  const nome = searchParams.get('nome') || 'tutor';
  const plano = searchParams.get('plano');
  
  const firstName = nome.split(' ')[0];
  const WHATSAPP_NUMBER = "5511999999999"; // Substituir
  
  const msg = plano
    ? `Olá! Acabei de me cadastrar no plano ${plano} do VetPro Orienta.`
    : `Olá! Acabei de me cadastrar no VetPro Orienta.`;
    
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="w-full max-w-[480px] bg-brand-surface border border-brand-border-strong rounded-[24px] p-9 md:p-11 text-center shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] z-10 relative">
      <div className="w-[72px] h-[72px] mx-auto mb-6 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center text-brand-accent-2">
        <Check className="w-[34px] h-[34px]" strokeWidth={2.5} />
      </div>

      <h1 className="font-display text-[26px] font-bold tracking-tight mb-3">
        Recebemos seu cadastro, <span className="text-brand-teal">{firstName}</span>! 🐾
      </h1>
      
      <p className="text-[15px] text-brand-text-muted mb-6 leading-[1.6]">
        Falta só um passinho: <strong className="text-brand-text font-medium">verifique o e-mail e o WhatsApp</strong> que você cadastrou — é por lá que a gente vai continuar com você.
      </p>

      {plano && (
        <div className="inline-flex items-center gap-2 bg-brand-surface-2 border border-brand-border-strong px-4 py-2 rounded-full text-[13px] text-brand-text-muted mb-7">
          Plano escolhido: <b className="text-brand-text">{plano}</b>
        </div>
      )}

      <ul className="text-left flex flex-col gap-3.5 mb-8">
        <li className="flex gap-3 text-sm text-brand-text-muted">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-teal/15 text-brand-teal font-display text-xs font-bold flex items-center justify-center">1</span>
          <span className="pt-0.5">Confira seu <strong className="text-brand-text font-medium">e-mail</strong> — enviamos a confirmação do seu cadastro por lá.</span>
        </li>
        <li className="flex gap-3 text-sm text-brand-text-muted">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-teal/15 text-brand-teal font-display text-xs font-bold flex items-center justify-center">2</span>
          <span className="pt-0.5">De olho no <strong className="text-brand-text font-medium">WhatsApp</strong> — é por lá que vamos falar com você sobre os próximos passos.</span>
        </li>
        <li className="flex gap-3 text-sm text-brand-text-muted">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-teal/15 text-brand-teal font-display text-xs font-bold flex items-center justify-center">3</span>
          <span className="pt-0.5">Se preferir, continue a conversa agora mesmo clicando no botão abaixo.</span>
        </li>
      </ul>

      <a 
        href={waLink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="w-full bg-gradient-to-b from-brand-accent-2 to-brand-accent text-brand-accent-ink px-[26px] py-[15px] rounded-full font-display font-semibold text-[15px] hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-10px_rgba(34,197,94,0.55)] transition-all flex items-center justify-center gap-2.5 mb-5"
      >
        <MessageCircle className="w-[18px] h-[18px]" />
        Falar no WhatsApp agora
      </a>

      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-brand-text-muted hover:text-brand-text transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para a página inicial
      </Link>
    </div>
  );
}

export default function ObrigadoPage() {
  return (
    <div className="min-h-screen relative font-body flex items-center justify-center p-6 selection:bg-brand-teal/30 selection:text-brand-text">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/15 via-brand-bg to-brand-bg h-[480px]" />
      <Suspense fallback={<div className="text-brand-text-muted">Carregando...</div>}>
        <ObrigadoContent />
      </Suspense>
    </div>
  );
}
