import { Shield, UserPlus, Settings, Trash2, Search } from 'lucide-react';

export default function UsuariosPage() {
  const users = [
    { id: 1, name: 'Tutor Silva', email: 'tutor@email.com', role: 'tutor', status: 'Ativo' },
    { id: 2, name: 'Dra. Amanda', email: 'amanda.vet@clinica.com', role: 'veterinario', status: 'Ativo' },
    { id: 3, name: 'Super Admin', email: 'admin@clinica.com', role: 'admin', status: 'Ativo' },
    { id: 4, name: 'Tutor Carlos', email: 'carlos.t@email.com', role: 'tutor', status: 'Inativo' },
  ];

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold mb-1">Usuários e Permissões</h1>
            <p className="text-brand-text-muted text-sm">Gerencie os acessos de tutores, veterinários e administradores do seu tenant.</p>
          </div>
          <button className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-brand-teal/90 transition-all">
            <UserPlus className="w-4 h-4" /> Convidar Usuário
          </button>
        </div>

        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-brand-border-strong bg-brand-surface-2/30 flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input type="text" placeholder="Buscar por nome ou email..." className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-brand-teal transition-colors" />
            </div>
            
            <div className="flex gap-2">
              <select className="bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-teal text-brand-text-muted transition-colors">
                <option value="all">Todas as Funções</option>
                <option value="admin">Administrador</option>
                <option value="veterinario">Veterinário</option>
                <option value="tutor">Tutor</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-brand-bg text-brand-text-muted border-b border-brand-border-strong">
                <tr>
                  <th className="px-6 py-4 font-medium">Usuário</th>
                  <th className="px-6 py-4 font-medium">Função (Role)</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-strong">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-brand-surface-2/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-brand-text">{user.name}</div>
                      <div className="text-xs text-brand-text-muted mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        defaultValue={user.role}
                        className="bg-brand-surface-2 border border-brand-border-strong rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-teal transition-colors"
                      >
                        <option value="admin">Admin</option>
                        <option value="veterinario">Veterinário</option>
                        <option value="tutor">Tutor</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${user.status === 'Ativo' ? 'bg-brand-teal/10 text-brand-teal border border-brand-teal/20' : 'bg-brand-surface-2 text-brand-text-muted border border-brand-border-strong'}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 rounded-lg transition-colors">
                          <Settings className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-brand-text-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
