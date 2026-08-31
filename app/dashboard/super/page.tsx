'use client';

import Link from 'next/link';
import { 
  Building, Users, BrainCircuit, CreditCard, Zap, TerminalSquare, 
  ArrowUpRight, ShieldCheck, Activity, Stethoscope, Sparkles
} from 'lucide-react';

export default function SuperAdminDashboard() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-brand-teal/15 text-brand-teal text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                👑 Super Admin Master
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold">Painel Global do Sistema</h1>
            <p className="text-brand-text-muted text-sm">Visão geral de infraestrutura multi-tenant, consumo de IA e monetização.</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Clínicas Assinantes</div>
            <div className="text-2xl font-bold text-brand-teal">4</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-brand-teal font-semibold">100% ativas</span> • 3 planos Pro/Master
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Médicos Veterinários</div>
            <div className="text-2xl font-bold text-brand-text">19</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-blue-400 font-semibold">100% validados com CRMV</span>
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Tutores Ativos</div>
            <div className="text-2xl font-bold text-brand-text">1.519</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-brand-teal font-semibold">+84 pets</span> cadastrados esta semana
            </div>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 shadow-sm">
            <div className="text-brand-text-muted text-xs font-semibold uppercase tracking-wider mb-1">Consumo IA (Tokens)</div>
            <div className="text-2xl font-bold text-brand-text">1.2M</div>
            <div className="text-[11px] text-brand-text-muted mt-1.5 flex items-center gap-1">
              <span className="text-brand-teal font-semibold">Gemini 2.5 Flash</span> (Latência ~420ms)
            </div>
          </div>
        </div>

        {/* Quick Management Hub */}
        <h2 className="font-display text-lg font-bold mb-4 text-brand-text">Acesso Rápido às Configurações Globais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Link 
            href="/dashboard/super/tenants"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Todas as Clínicas (Tenants)
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-teal transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Criação de novas instâncias, alocação de planos e visualização de membros de cada empresa.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/usuarios"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Usuários & CRMV de Vets
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-blue-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Edição de perfil de usuários, funções, clínicas vinculadas e carteira profissional CRMV.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/super/planos"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Gestão de Planos & Preços
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-amber-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Configuração de limites de tutores, preços de assinaturas e recursos incluídos por plano.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/ia-config"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Configuração da IA & RAG
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-purple-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Edição de System Prompt, parâmetros de temperatura, materiais de conhecimento e chaves de API.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/modulos"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Módulos & Recursos
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-emerald-400 transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Habilite ou desabilite prescrição digital, transferências para humano e disparos WhatsApp.
              </p>
            </div>
          </Link>

          <Link 
            href="/dashboard/automacoes"
            className="bg-brand-surface border border-brand-border-strong rounded-2xl p-5 hover:border-brand-teal/50 hover:bg-brand-surface-2/40 transition-all group shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-surface-2 text-brand-text-muted flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TerminalSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1 flex items-center justify-between">
                Automações & Scripts
                <ArrowUpRight className="w-4 h-4 text-brand-text-muted group-hover:text-brand-teal transition-colors" />
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Execução de scripts de sincronização, webhooks e limpeza de auditoria.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
