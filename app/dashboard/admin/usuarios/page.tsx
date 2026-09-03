'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, UserPlus, Settings, Trash2, Search, Edit2, CheckCircle2, 
  AlertCircle, Stethoscope, Building, Phone, Mail, Check, X, RefreshCw
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'veterinario' | 'tutor';
  status: 'active' | 'inactive';
  tenantId?: string;
  crmv?: string;
  crmvUf?: string;
  crmvValidated?: boolean;
  specialty?: string;
}

const DEFAULT_USERS: SystemUser[] = [
  { 
    id: 'usr-1', 
    name: 'Marcelo (Super Admin)', 
    email: 'marcelobfo@gmail.com', 
    phone: '(11) 99999-8888',
    role: 'super_admin', 
    status: 'active',
    tenantId: 'tenant-3'
  },
  { 
    id: 'usr-2', 
    name: 'Dra. Amanda Nogueira', 
    email: 'amanda.vet@saovet.com.br', 
    phone: '(11) 98765-4321',
    role: 'veterinario', 
    status: 'active',
    tenantId: 'tenant-1',
    crmv: '34892',
    crmvUf: 'SP',
    crmvValidated: true,
    specialty: 'Clínica Geral & Cirurgia'
  },
  { 
    id: 'usr-3', 
    name: 'Dr. Roberto Mendes', 
    email: 'roberto@saovet.com.br', 
    phone: '(11) 97777-6666',
    role: 'admin', 
    status: 'active',
    tenantId: 'tenant-1',
    crmv: '18204',
    crmvUf: 'SP',
    crmvValidated: true,
    specialty: 'Diretor Clínico'
  },
  { 
    id: 'usr-4', 
    name: 'Carlos Eduardo (Tutor)', 
    email: 'carlos.t@gmail.com', 
    phone: '(11) 91234-5678',
    role: 'tutor', 
    status: 'active',
    tenantId: 'tenant-1'
  }
];

export default function UsuariosPage() {
  const [users, setUsers] = useState<SystemUser[]>(DEFAULT_USERS);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([
    { id: 'tenant-1', name: 'Clínica Veterinária São Francisco' },
    { id: 'tenant-2', name: 'Hospital Veterinário PetCare 24h' },
    { id: 'tenant-3', name: 'VetPro Global (Sistema Principal)' },
    { id: 'tenant-4', name: 'Clínica Amigo Fiel' },
  ]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingTenantUserId, setUpdatingTenantUserId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin' | 'veterinario' | 'tutor'>('veterinario');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [tenantId, setTenantId] = useState('tenant-1');
  const [crmv, setCrmv] = useState('');
  const [crmvUf, setCrmvUf] = useState('SP');
  const [specialty, setSpecialty] = useState('');

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carregar do Supabase ou LocalStorage
  const loadUsers = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (isSupabaseConfigured()) {
        // Carrega tenants
        const { data: tData } = await supabase.from('tenants').select('id, name').order('name');
        if (tData && tData.length > 0) {
          setTenants(tData);
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Erro ao buscar do Supabase, usando dados locais:', error.message);
          const saved = localStorage.getItem('vetpro_users_list');
          if (saved) setUsers(JSON.parse(saved));
        } else if (data && data.length > 0) {
          const mapped: SystemUser[] = data.map((d: any) => ({
            id: d.id,
            name: d.full_name || d.name || 'Sem nome',
            email: d.email || '',
            phone: d.phone || '',
            role: d.role || 'tutor',
            status: d.status || 'active',
            tenantId: d.tenant_id || 'tenant-1',
            crmv: d.crmv,
            crmvUf: d.crmv_uf,
            crmvValidated: d.crmv_validated,
            specialty: d.specialty
          }));
          setUsers(mapped);
          localStorage.setItem('vetpro_users_list', JSON.stringify(mapped));
        } else {
          // Se Supabase vazio, salvar padrão
          const saved = localStorage.getItem('vetpro_users_list');
          if (saved) setUsers(JSON.parse(saved));
        }
      } else {
        const saved = localStorage.getItem('vetpro_users_list');
        if (saved) setUsers(JSON.parse(saved));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTenantChange = async (user: SystemUser, newTenantId: string) => {
    setUpdatingTenantUserId(user.id);
    const targetTenant = tenants.find(t => t.id === newTenantId);
    const tName = targetTenant?.name || 'Clínica';

    // Atualiza estado local
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, tenantId: newTenantId } : u);
    setUsers(updatedUsers);
    localStorage.setItem('vetpro_users_list', JSON.stringify(updatedUsers));

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        await supabase
          .from('user_profiles')
          .update({
            tenant_id: newTenantId.startsWith('tenant-') ? null : newTenantId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      }
      showToast(`Usuário "${user.name}" transferido para "${tName}"!`);
    } catch (err: any) {
      console.error('Erro ao transferir tenant:', err);
      showToast(`Alterado localmente.`, 'success');
    } finally {
      setUpdatingTenantUserId(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchAsync = async () => {
      if (isMounted) {
        await loadUsers();
      }
    };
    void fetchAsync();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenAddModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPhone('');
    setRole('veterinario');
    setStatus('active');
    setTenantId('tenant-1');
    setCrmv('');
    setCrmvUf('SP');
    setSpecialty('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (u: SystemUser) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole(u.role);
    setStatus(u.status);
    setTenantId(u.tenantId || 'tenant-1');
    setCrmv(u.crmv || '');
    setCrmvUf(u.crmvUf || 'SP');
    setSpecialty(u.specialty || '');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (role === 'veterinario' && !crmv.trim()) {
      showToast('Por favor, informe o número do CRMV para o médico veterinário.', 'error');
      return;
    }

    const userData = {
      name,
      email,
      phone,
      role,
      status,
      tenantId,
      crmv: role === 'veterinario' || role === 'admin' ? crmv : undefined,
      crmvUf: role === 'veterinario' || role === 'admin' ? crmvUf : undefined,
      crmvValidated: role === 'veterinario' || role === 'admin' ? true : false,
      specialty: role === 'veterinario' || role === 'admin' ? specialty : undefined,
    };

    let updatedUsers: SystemUser[];

    if (editingUser) {
      updatedUsers = users.map(u => u.id === editingUser.id ? { ...u, ...userData } : u);
    } else {
      const newUser: SystemUser = {
        id: `usr-${Date.now()}`,
        ...userData,
      };
      updatedUsers = [newUser, ...users];
    }

    setUsers(updatedUsers);
    localStorage.setItem('vetpro_users_list', JSON.stringify(updatedUsers));

    // Salvar no Supabase se conectado
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const payload: any = {
          full_name: name,
          email,
          phone,
          role,
          status,
          tenant_id: tenantId.startsWith('tenant-') ? null : tenantId,
          crmv: userData.crmv || null,
          crmv_uf: userData.crmvUf || null,
          crmv_validated: userData.crmvValidated || false,
          specialty: userData.specialty || null,
        };

        if (editingUser && !editingUser.id.startsWith('usr-')) {
          const { error } = await supabase.from('user_profiles').update(payload).eq('id', editingUser.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('user_profiles').insert([payload]);
          if (error) {
            console.warn('Inserção no Supabase avisou:', error.message);
          }
        }
        showToast('Usuário salvo no Supabase com sucesso!');
      } catch (err: any) {
        console.error('Erro ao salvar no Supabase:', err);
        showToast(`Salvo localmente! Supabase reportou: ${err.message || 'tabela não encontrada'}`, 'success');
      }
    } else {
      showToast('Usuário atualizado com sucesso (modo local)!');
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    if (!confirm(`Deseja realmente remover o usuário "${userName}"?`)) return;

    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    localStorage.setItem('vetpro_users_list', JSON.stringify(updated));

    if (isSupabaseConfigured() && !id.startsWith('usr-')) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from('user_profiles').delete().eq('id', id);
        showToast('Usuário removido do Supabase com sucesso.');
      } catch (err) {
        console.error(err);
      }
    } else {
      showToast('Usuário removido.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.crmv && u.crmv.includes(searchTerm));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg relative">
      {/* Toast */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in duration-200 ${
          toastMessage.type === 'error' ? 'bg-brand-danger text-white' : 'bg-brand-teal text-brand-bg'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-500/15 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Controle de Acessos & CRMV
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Usuários e Permissões</h1>
            <p className="text-brand-text-muted text-sm">
              Gerencie cadastros, perfis de acesso, credenciais CRMV de veterinários e persistência no banco.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={loadUsers}
              disabled={loading}
              className="p-2.5 bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 rounded-full transition-colors"
              title="Recarregar do Banco"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button 
              onClick={handleOpenAddModal}
              className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2 hover:bg-brand-teal/90 transition-all shadow-md shrink-0"
            >
              <UserPlus className="w-4 h-4" /> Novo Usuário
            </button>
          </div>
        </div>

        {/* Supabase Status Banner */}
        <SupabaseStatusBanner />

        {/* Filtros e Busca */}
        <div className="bg-brand-surface border border-brand-border-strong rounded-2xl overflow-hidden shadow-sm mb-8">
          <div className="p-4 border-b border-brand-border-strong bg-brand-surface-2/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input 
                type="text" 
                placeholder="Buscar por nome, e-mail ou CRMV..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text transition-colors" 
              />
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-brand-bg border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text transition-colors w-full sm:w-auto font-medium"
              >
                <option value="all">Todas as Funções ({users.length})</option>
                <option value="super_admin">Super Admins</option>
                <option value="admin">Administradores</option>
                <option value="veterinario">Veterinários (CRMV)</option>
                <option value="tutor">Tutores</option>
              </select>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-brand-surface-2/60 text-brand-text-muted border-b border-brand-border-strong text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Função / Perfil</th>
                  <th className="px-6 py-4">Clínica / Tenant (Mude Aqui)</th>
                  <th className="px-6 py-4">Habilitação Profissional</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border-strong text-xs">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-brand-surface-2/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-brand-text text-sm">{user.name}</div>
                      <div className="text-xs text-brand-text-muted mt-0.5 flex items-center gap-2">
                        <span>{user.email}</span>
                        {user.phone && <span>• {user.phone}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        user.role === 'super_admin' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        user.role === 'admin' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' :
                        user.role === 'veterinario' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                        'bg-brand-teal/10 text-brand-teal border border-brand-teal/20'
                      }`}>
                        {user.role === 'super_admin' ? '👑 Super Admin' :
                         user.role === 'admin' ? '⚡ Administrador' :
                         user.role === 'veterinario' ? '🩺 Médico Veterinário' :
                         '🐾 Tutor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.tenantId || 'tenant-1'}
                        disabled={updatingTenantUserId === user.id}
                        onChange={(e) => handleQuickTenantChange(user, e.target.value)}
                        className="bg-brand-surface border border-brand-teal/30 hover:border-brand-teal rounded-xl px-2.5 py-1.5 text-xs text-brand-teal font-medium focus:outline-none cursor-pointer transition-colors shadow-sm"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            🏥 {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {user.crmv ? (
                        <div>
                          <div className="font-mono text-xs font-bold text-brand-teal flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" />
                            CRMV-{user.crmvUf} {user.crmv}
                            {user.crmvValidated && (
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.2 rounded">
                                Validado
                              </span>
                            )}
                          </div>
                          {user.specialty && (
                            <div className="text-[11px] text-brand-text-muted mt-0.5">{user.specialty}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-brand-text-muted text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                        user.status === 'active' 
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-brand-danger/15 text-brand-danger border border-brand-danger/30'
                      }`}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenEditModal(user)}
                          className="p-2 text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 rounded-lg transition-colors"
                          title="Editar Usuário"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 text-brand-danger hover:bg-brand-danger/10 rounded-lg transition-colors"
                          title="Excluir Usuário"
                        >
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

        {/* Modal de Criação / Edição */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-bold">
                    {editingUser ? `Editar: ${editingUser.name}` : 'Cadastrar Novo Usuário'}
                  </h3>
                  <p className="text-xs text-brand-text-muted">
                    Configure os dados cadastrais e permissões de acesso ao sistema.
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-brand-text-muted hover:text-brand-text rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Dra. Amanda Nogueira"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">E-mail</label>
                    <input 
                      type="email" 
                      required
                      placeholder="amanda@clinica.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Telefone / WhatsApp</label>
                    <input 
                      type="text" 
                      placeholder="(11) 98765-4321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Função (Role)</label>
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text font-medium"
                    >
                      <option value="veterinario">🩺 Médico Veterinário (Exige CRMV)</option>
                      <option value="admin">⚡ Administrador da Clínica</option>
                      <option value="tutor">🐾 Tutor / Cliente</option>
                      <option value="super_admin">👑 Super Admin Master</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-brand-text-muted mb-1.5">Status da Conta</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                    >
                      <option value="active">Ativo (Acesso Liberado)</option>
                      <option value="inactive">Inativo (Bloqueado)</option>
                    </select>
                  </div>
                </div>

                {/* Campos de CRMV (Médico Veterinário ou Admin) */}
                {(role === 'veterinario' || role === 'admin') && (
                  <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                      <Stethoscope className="w-4 h-4" /> Dados Profissionais do Veterinário
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[11px] font-medium text-brand-text-muted mb-1">Número do CRMV</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 34892"
                          value={crmv}
                          onChange={(e) => setCrmv(e.target.value)}
                          className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-teal text-brand-text font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-brand-text-muted mb-1">UF CRMV</label>
                        <select 
                          value={crmvUf}
                          onChange={(e) => setCrmvUf(e.target.value)}
                          className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-2 py-2 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                        >
                          {['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE', 'CE', 'GO', 'DF', 'ES', 'AM', 'PA', 'MT', 'MS'].map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-brand-text-muted mb-1">Especialidade Clínica</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Clínica Médica, Dermatologia, Cirurgia"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-teal text-brand-text"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border-strong">
                  <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs text-brand-text-muted hover:text-brand-text"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-brand-teal/90 shadow-md"
                  >
                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
