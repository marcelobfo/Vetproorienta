import { Zap, ShieldCheck } from 'lucide-react';

export default function ModulosAdminPage() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">Gestão de Módulos (Super Admin)</h1>
        <p className="text-brand-text-muted text-sm mb-8">Habilite ou desabilite módulos e funcionalidades extras globalmente ou por tenant.</p>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-teal/20 text-brand-teal flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Módulo de Especialista</h3>
                  <p className="text-xs text-brand-text-muted">Acesso a veterinários humanos</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-brand-teal rounded-full relative cursor-pointer hover:bg-brand-teal/90 transition-colors">
                <div className="w-4 h-4 bg-brand-bg rounded-full absolute right-0.5 top-0.5"></div>
              </div>
            </div>
            <p className="text-sm text-brand-text-muted leading-relaxed">Permite que o tenant tenha acesso ao botão de escalar a dúvida para um humano no painel do chat.</p>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-surface-2 text-brand-text-muted flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Integração de Receitas</h3>
                  <p className="text-xs text-brand-text-muted">Emissão de prescrições simples</p>
                </div>
              </div>
              <div className="w-10 h-5 bg-brand-surface-2 border border-brand-border-strong rounded-full relative cursor-pointer hover:bg-brand-surface-2/80 transition-colors">
                <div className="w-4 h-4 bg-brand-text-muted rounded-full absolute left-0.5 top-0.5"></div>
              </div>
            </div>
            <p className="text-sm text-brand-text-muted leading-relaxed">Integração com farmácias parceiras (Necessita configuração de credenciais no painel do script).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
