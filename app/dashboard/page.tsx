import { Dog, MessageSquare, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function TutorDashboard() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">Olá, Tutor!</h1>
        <p className="text-brand-text-muted text-sm mb-8">Bem-vindo(a) à sua área exclusiva de cuidados com seu pet.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/20 text-brand-teal flex items-center justify-center mb-4">
              <Dog className="w-5 h-5" />
            </div>
            <h3 className="font-medium mb-1">Meus Pets</h3>
            <p className="text-xs text-brand-text-muted mb-4 flex-1">Você tem 1 pet cadastrado no momento.</p>
            <Link href="/dashboard/pets" className="text-sm font-medium text-brand-teal hover:text-brand-accent-2 flex items-center gap-1.5 transition-colors">
              Gerenciar pets <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex flex-col">
            <div className="w-10 h-10 rounded-xl bg-brand-accent/20 text-brand-accent-2 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-medium mb-1">Nova Triagem</h3>
            <p className="text-xs text-brand-text-muted mb-4 flex-1">Inicie uma nova conversa com nossa IA para orientações.</p>
            <Link href="/dashboard/chat" className="text-sm font-medium text-brand-accent-2 hover:text-brand-accent flex items-center gap-1.5 transition-colors">
              Iniciar chat <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-gradient-to-br from-brand-surface to-brand-surface-2 border border-brand-border-strong rounded-2xl p-6 flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-brand-accent/10 transition-colors"></div>
            <div className="w-10 h-10 rounded-xl bg-brand-accent-ink border border-brand-accent/30 text-brand-accent-2 flex items-center justify-center mb-4 relative z-10">
              <Star className="w-5 h-5" />
            </div>
            <h3 className="font-medium mb-1 relative z-10">Plano Essencial</h3>
            <p className="text-xs text-brand-text-muted mb-4 flex-1 relative z-10">Status: <span className="text-brand-teal font-medium">Ativo</span></p>
            <Link href="/dashboard/assinatura" className="text-sm font-medium text-brand-accent-2 hover:text-brand-accent flex items-center gap-1.5 transition-colors relative z-10">
              Fazer upgrade <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <h2 className="font-display text-lg font-bold mb-4">Histórico Recente</h2>
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-brand-border-strong flex items-center justify-between bg-brand-surface-2/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-bg border border-brand-border-strong flex items-center justify-center text-xs shrink-0">🐶</div>
              <div>
                <div className="text-sm font-medium text-brand-text">Consulta sobre coceira (Bidu)</div>
                <div className="text-xs text-brand-text-muted">Ontem às 14:30</div>
              </div>
            </div>
            <Link href="/dashboard/historico" className="px-3 py-1.5 rounded-lg border border-brand-border-strong text-xs font-medium hover:bg-brand-surface-2 transition-colors shrink-0">Ver detalhes</Link>
          </div>
          <div className="p-4 text-center text-sm text-brand-text-muted py-8">
            Nenhum outro histórico encontrado.
          </div>
        </div>
      </div>
    </div>
  );
}
