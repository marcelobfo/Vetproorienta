import { Terminal } from 'lucide-react';

export default function AutomacoesPage() {
  return (
    <div className="p-8 h-full flex flex-col">
      <h1 className="font-display text-2xl font-bold mb-2">Automações & Scripts</h1>
      <p className="text-brand-text-muted text-sm mb-8">Execute scripts customizados ou integre novos módulos no ambiente do tenant.</p>

      <div className="flex-1 bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden flex flex-col">
        <div className="bg-brand-surface-2 border-b border-brand-border-strong px-4 py-3 flex items-center gap-3">
          <Terminal className="w-4 h-4 text-brand-text-muted" />
          <span className="text-sm font-medium">Editor de Script de Automação (Ambiente Isolado)</span>
        </div>
        
        <div className="flex-1 p-4 bg-[#0a0a0a] font-mono text-[13px] text-gray-300">
          <pre>
{`// Exemplo: Script para notificar usuários inativos
async function runJob(tenantId, ctx) {
  const { db, emailService } = ctx;
  
  // Buscar tutores inativos no Supabase
  const inativos = await db
    .from('user_profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .lt('last_login', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
  // Enviar lembretes
  for (const user of inativos.data) {
    await emailService.send(user.email, 'Sentimos sua falta no VetPro Orienta!');
  }
  
  return { success: true, processed: inativos.data.length };
}`}
          </pre>
        </div>

        <div className="p-4 border-t border-brand-border-strong bg-brand-surface flex justify-end gap-3">
          <button className="px-4 py-2 rounded-xl text-sm border border-brand-border-strong hover:bg-brand-surface-2 transition-colors">
            Salvar Script
          </button>
          <button className="px-4 py-2 rounded-xl text-sm bg-brand-teal/20 text-brand-teal hover:bg-brand-teal/30 transition-colors font-medium">
            Executar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
