import { CheckCircle2, Zap } from 'lucide-react';

export default function AssinaturaPage() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">Assinatura e Upgrade</h1>
        <p className="text-brand-text-muted text-sm mb-10">Gerencie seu plano e libere novos módulos do VetPro Orienta.</p>

        <div className="bg-brand-surface border border-brand-border-strong rounded-[20px] p-6 mb-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-lg font-bold mb-1">Plano Atual: <span className="text-brand-teal">Essencial</span></h2>
            <p className="text-sm text-brand-text-muted">Sua assinatura está ativa. Próxima renovação em 12/10/2026.</p>
          </div>
          <div className="text-right w-full md:w-auto">
            <div className="text-2xl font-display font-bold">R$ 9,90 <span className="text-sm text-brand-text-muted font-normal">/mês</span></div>
            <button className="text-brand-danger text-sm font-medium mt-2 hover:underline w-full md:w-auto text-right">Cancelar assinatura</button>
          </div>
        </div>

        <h2 className="font-display text-xl font-bold mb-6">Fazer Upgrade</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Specialist Plan */}
          <div className="bg-gradient-to-b from-brand-surface-2 to-brand-surface border border-brand-accent/50 rounded-[20px] p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-accent/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-brand-accent text-brand-accent-ink text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">Recomendado</span>
            </div>
            <h3 className="text-xl font-display font-bold mb-2">Especialista</h3>
            <p className="text-sm text-brand-text-muted mb-6 h-10">Desbloqueie atendimento humano especializado e módulos extras.</p>
            <div className="text-3xl font-display font-bold mb-8">R$ 29,90 <span className="text-sm text-brand-text-muted font-normal">/mês</span></div>
            
            <ul className="space-y-3.5 mb-8">
              <li className="flex gap-3 text-sm text-brand-text">
                <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                Atendimento humano prioritário
              </li>
              <li className="flex gap-3 text-sm text-brand-text">
                <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                Acesso a módulos avançados de cuidados
              </li>
              <li className="flex gap-3 text-sm text-brand-text">
                <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
                Histórico vitalício de consultas
              </li>
            </ul>

            <button className="w-full py-3.5 rounded-full bg-brand-accent text-brand-accent-ink font-bold text-sm hover:-translate-y-0.5 shadow-lg shadow-brand-accent/20 transition-all flex items-center justify-center gap-2 relative z-10">
              <Zap className="w-4 h-4 fill-brand-accent-ink" />
              Mudar para o Especialista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
