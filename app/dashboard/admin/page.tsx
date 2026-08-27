export default function AdminDashboard() {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h1 className="font-display text-2xl font-bold mb-2">Painel do Super Admin</h1>
        <p className="text-brand-text-muted text-sm mb-8">Visão geral do sistema e infraestrutura multi-tenant.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-sm font-medium mb-1">Assinantes Ativos</div>
            <div className="text-2xl font-bold text-brand-teal">1,240</div>
            <div className="text-xs text-brand-text-muted mt-2">+12% este mês</div>
          </div>
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-sm font-medium mb-1">Uso da IA (Tokens)</div>
            <div className="text-2xl font-bold">1.2M</div>
            <div className="text-xs text-brand-text-muted mt-2">Dentro do limite</div>
          </div>
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-sm font-medium mb-1">Módulos Extras Ativos</div>
            <div className="text-2xl font-bold">45</div>
            <div className="text-xs text-brand-text-muted mt-2">Liberados para assinantes Pro</div>
          </div>
        </div>

        <div className="bg-brand-surface-2/50 border border-brand-border-strong rounded-2xl p-8 text-center max-w-2xl mx-auto mt-12">
          <h2 className="font-display text-xl font-bold mb-3">Gestão Centralizada</h2>
          <p className="text-sm text-brand-text-muted mb-6 leading-relaxed">
            Use a barra lateral para acessar logs de auditoria, executar scripts de automação customizados ou gerenciar as permissões e módulos habilitados para cada Tenant.
          </p>
        </div>
      </div>
    </div>
  );
}
