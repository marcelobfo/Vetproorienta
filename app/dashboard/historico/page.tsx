import { History, Search } from 'lucide-react';

export default function HistoricoPage() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-1">Histórico de Triagens</h1>
        <p className="text-brand-text-muted text-sm mb-8">Acompanhe todas as suas interações anteriores com a IA.</p>

        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-brand-border-strong bg-brand-surface-2/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input type="text" placeholder="Buscar no histórico..." className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-teal transition-colors" />
            </div>
          </div>

          <div className="divide-y divide-brand-border-strong">
            <div className="p-4 hover:bg-brand-surface-2/30 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-brand-surface-2 border border-brand-border-strong flex items-center justify-center shrink-0">
                  <History className="w-4 h-4 text-brand-text-muted" />
                </div>
                <div>
                  <h4 className="font-medium text-brand-text group-hover:text-brand-teal transition-colors">Consulta sobre coceira intensa</h4>
                  <p className="text-xs text-brand-text-muted mb-1.5">Pet: Bidu • Realizada em 26/08/2026 às 14:30</p>
                  <p className="text-sm text-brand-text-muted line-clamp-1">"Meu cachorro está se coçando muito na região da orelha e chorando..."</p>
                </div>
              </div>
              <button className="text-xs font-medium text-brand-teal border border-brand-border-strong px-4 py-2 rounded-lg shrink-0 group-hover:border-brand-teal/50 transition-colors">
                Ler transcrição
              </button>
            </div>
            
            {/* Empty state or older histories would go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
