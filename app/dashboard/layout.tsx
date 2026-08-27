'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  MessageSquare, CreditCard, Activity, TerminalSquare,
  Package, LogOut, User, Dog, History, Shield, Zap, Settings,
  BrainCircuit, Users, Globe
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<'tutor' | 'admin' | 'super_admin' | null>(null);
  const [profileName, setProfileName] = useState('Carregando...');
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      // Fetch real role from user_profiles
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        setRole(profile.role as 'tutor' | 'admin' | 'super_admin');
        setProfileName(profile.full_name);
      } else {
        // Fallback or handle missing profile
        setRole('tutor');
        setProfileName('Tutor');
      }
      setLoading(false);
    }
    
    loadSession();

    // Listen for auth changes (logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const tutorNavItems = [
    { name: 'Início', href: '/dashboard', icon: User },
    { name: 'Triagem AI (Chat)', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Meus Pets', href: '/dashboard/pets', icon: Dog },
    { name: 'Histórico', href: '/dashboard/historico', icon: History },
    { name: 'Assinatura & Upgrade', href: '/dashboard/assinatura', icon: CreditCard },
  ];

  const adminNavItems = [
    { name: 'Visão Geral (Clínica)', href: '/dashboard/admin', icon: Activity },
    { name: 'Usuários & Permissões', href: '/dashboard/admin/usuarios', icon: Users },
    { name: 'Configuração da IA', href: '/dashboard/admin/ia-config', icon: BrainCircuit },
    { name: 'Gestão de Módulos', href: '/dashboard/admin/modulos', icon: Zap },
    { name: 'Automações (Scripts)', href: '/dashboard/automacoes', icon: TerminalSquare },
  ];

  const superAdminNavItems = [
    { name: 'Painel Global', href: '/dashboard/super', icon: Globe },
    { name: 'Todas as Clínicas (Tenants)', href: '/dashboard/super/tenants', icon: Package },
    { name: 'Todos os Usuários', href: '/dashboard/super/usuarios', icon: Users },
    { name: 'Logs Globais', href: '/dashboard/admin/logs', icon: Shield },
  ];

  let navItems = tutorNavItems;
  if (role === 'admin') navItems = adminNavItems;
  if (role === 'super_admin') navItems = superAdminNavItems;

  if (loading) {
    return <div className="min-h-screen bg-brand-bg flex items-center justify-center text-brand-teal">Carregando painel...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-brand-border-strong bg-brand-surface-2/30 flex flex-col shrink-0">
        <div className="h-[76px] flex items-center px-6 border-b border-brand-border-strong shrink-0">
          <Link href={role === 'admin' ? '/dashboard/admin' : role === 'super_admin' ? '/dashboard/super' : '/dashboard'} className="flex items-center gap-2.5 font-display font-bold text-[18px]">
            <span className="w-[30px] h-[30px] rounded-lg bg-brand-accent/15 flex items-center justify-center text-[15px]">
              🐾
            </span>
            <span>VetPro <b className="text-brand-teal">Painel</b></span>
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 flex flex-col gap-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-colors ${isActive ? 'bg-brand-surface text-brand-text font-medium border border-brand-border-strong shadow-sm' : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface/50 border border-transparent'}`}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-border-strong bg-brand-bg-elevated/50 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-surface-2 flex items-center justify-center shrink-0 border border-brand-border-strong">
              <User className="w-4 h-4 text-brand-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-brand-text">
                {profileName}
              </p>
              <p className="text-[11px] text-brand-text-muted truncate capitalize">
                Perfil: {role === 'super_admin' ? 'Super Admin' : role}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
