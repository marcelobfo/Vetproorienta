import { Dog, Plus } from 'lucide-react';

export default function PetsPage() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold mb-1">Meus Pets</h1>
          <p className="text-brand-text-muted text-sm">Gerencie os cadastros dos seus animais de estimação.</p>
        </div>
        <button className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-brand-teal/90 hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" /> Adicionar Pet
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 flex items-start gap-4 relative group cursor-pointer hover:border-brand-teal/40 transition-colors">
          <div className="w-14 h-14 rounded-full bg-brand-surface-2 border border-brand-border-strong flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
            🐶
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-brand-text">Bidu</h3>
            <p className="text-sm text-brand-text-muted mb-1">Cachorro • SRD • 4 anos</p>
            <p className="text-xs text-brand-text-muted">Última triagem: Ontem</p>
          </div>
        </div>
        
        {/* Adicionar Pet Placeholder */}
        <div className="bg-brand-surface/30 border border-dashed border-brand-border-strong rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-brand-surface/50 hover:border-brand-border transition-colors min-h-[120px]">
          <div className="w-10 h-10 rounded-full bg-brand-surface-2 flex items-center justify-center text-brand-text-muted">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-brand-text-muted">Cadastrar novo pet</span>
        </div>
      </div>
    </div>
  );
}
