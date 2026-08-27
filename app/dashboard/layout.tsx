'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare, CreditCard, Activity, TerminalSquare,
  Package, LogOut, User, Dog, History, Shield, Zap, Settings
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<'tutor' | 'admin'>('tutor');
  const pathname = usePathname();

  const tutorNavItems = [
    { name: 'Início', href: '/dashboard', icon: User },
    { name: 'Triagem AI (Chat)', href: '/dashboard/chat', icon: MessageSquare },
    { name: 'Meus Pets', href: '/dashboard/pets', icon: Dog },
    { name: 'Histórico', href: '/dashboard/historico', icon: History },
    { name: 'Assinatura & Upgrade', href: '/dashboard/assinatura', icon: CreditCard },
  ];

  const adminNavItems = [
    { name: 'Visão Geral', href: '/dashboard/admin', icon: Activity },
    { name: 'Gestão de Módulos', href: '/dashboard/admin/modulos', icon: Zap },
    { name: 'Logs de Auditoria', href: '/dashboard/admin/logs', icon: Shield },
    { name: 'Automações (Scripts)', href: '/dashboard/automacoes', icon: TerminalSquare },
    { name: 'Apps Internos', href: '/dashboard/admin/apps', icon: Package },
  ];

  const navItems = role === 'admin' ? adminNavItems : tutorNavItems;

  return (
    <div className="min-h-screen bg-brand-bg flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-brand-border-strong bg-brand-surface-2/30 flex flex-col shrink-0">
        <div className="h-[76px] flex items-center px-6 border-b border-brand-border-strong shrink-0">
          <Link href={role === 'admin' ? '/dashboard/admin' : '/dashboard'} className="flex items-center gap-2.5 font-display font-bold text-[18px]">
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
          {/* Mock Role Switcher for demonstration */}
          <button 
            onClick={() => setRole(role === 'tutor' ? 'admin' : 'tutor')}
            className="w-full flex items-center justify-between px-3 py-2.5 mb-3 bg-brand-surface border border-brand-border-strong rounded-xl text-xs font-medium text-brand-text-muted hover:text-brand-text hover:border-brand-teal/50 transition-colors"
          >
            <span>Visão: {role === 'tutor' ? 'Tutor' : 'Super Admin'}</span>
            <Settings className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-brand-surface-2 flex items-center justify-center shrink-0 border border-brand-border-strong">
              <User className="w-4 h-4 text-brand-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-brand-text">
                {role === 'tutor' ? 'Tutor Silva' : 'Super Admin'}
              </p>
              <p className="text-[11px] text-brand-text-muted truncate">
                {role === 'tutor' ? 'Plano Essencial' : 'Acesso Total'}
              </p>
            </div>
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-sm text-brand-danger hover:bg-brand-danger/10 rounded-xl transition-colors">
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
