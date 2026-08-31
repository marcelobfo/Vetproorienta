import Link from 'next/link';
import { Activity, Smartphone, BrainCircuit, Users, TerminalSquare, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';

export default function AdminDashboard() {
  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Painel da Clínica</h1>
            <p className="text-brand-text-muted text-sm">Visão geral, métricas clínicas e canais de automação da sua unidade.</p>
          </div>
          <Link
            href="/dashboard/admin/whatsapp"
            className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Smartphone className="w-4 h-4" /> Conectar WhatsApp Evolution
          </Link>
        </div>

        {/* Banner Supabase */}
        <SupabaseStatusBanner />
        
        {/* Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-xs font-medium uppercase tracking-wider mb-1">Tutores Ativos</div>
            <div className="text-3xl font-bold text-brand-teal">124</div>
            <p className="text-[11px] text-brand-text-muted mt-2">Cadastrados e com histórico</p>
          </div>
          
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-xs font-medium uppercase tracking-wider mb-1">Triagens IA no Mês</div>
            <div className="text-3xl font-bold">452</div>
            <p className="text-[11px] text-emerald-400 mt-2">↑ 18% em relação ao mês anterior</p>
          </div>
          
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-xs font-medium uppercase tracking-wider mb-1">Alertas Vermelhos</div>
            <div className="text-3xl font-bold text-brand-danger">3</div>
            <p className="text-[11px] text-brand-danger mt-2">Encaminhados para pronto atendimento</p>
          </div>

          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6">
            <div className="text-brand-text-muted text-xs font-medium uppercase tracking-wider mb-1">Disparos WhatsApp</div>
            <div className="text-3xl font-bold text-emerald-400">890</div>
            <p className="text-[11px] text-brand-text-muted mt-2">Via Evolution API Gateway</p>
          </div>
        </div>

        {/* Atalhos Rápidos para Administração */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link 
            href="/dashboard/admin/asaas"
            className="p-6 bg-brand-surface border border-brand-border-strong rounded-2xl hover:border-brand-teal/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1.5 flex items-center justify-between">
                <span>Asaas & Pagamentos</span>
                <span className="text-xs text-brand-teal group-hover:translate-x-0.5 transition-transform">→</span>
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Integração de pagamentos, criação de clientes e controle de assinaturas dos planos.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-border-strong text-[11px] text-blue-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Clientes & Assinaturas
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/whatsapp"
            className="p-6 bg-brand-surface border border-brand-border-strong rounded-2xl hover:border-brand-teal/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1.5 flex items-center justify-between">
                <span>WhatsApp & Evolution</span>
                <span className="text-xs text-brand-teal group-hover:translate-x-0.5 transition-transform">→</span>
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Gerencie instâncias, gere o QR Code pelo Baileys e configure disparos automáticos.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-border-strong text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Suporte a QR Code & Gateway
            </div>
          </Link>

          <Link 
            href="/dashboard/admin/ia-config"
            className="p-6 bg-brand-surface border border-brand-border-strong rounded-2xl hover:border-brand-teal/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-brand-teal/10 text-brand-teal flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1.5 flex items-center justify-between">
                <span>Base RAG & Prompt IA</span>
                <span className="text-xs text-brand-teal group-hover:translate-x-0.5 transition-transform">→</span>
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Anexe protocolos clínicos em PDF/TXT e personalize as instruções do assistente para sua equipe.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-border-strong text-[11px] text-brand-teal flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Gemini 3.5 & Upload
            </div>
          </Link>

          <Link 
            href="/dashboard/automacoes"
            className="p-6 bg-brand-surface border border-brand-border-strong rounded-2xl hover:border-brand-teal/50 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TerminalSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base text-brand-text mb-1.5 flex items-center justify-between">
                <span>Automações & Scripts</span>
                <span className="text-xs text-brand-teal group-hover:translate-x-0.5 transition-transform">→</span>
              </h3>
              <p className="text-xs text-brand-text-muted leading-relaxed">
                Execute rotinas de auditoria de CRMVs, disparo em lote e monitoramento de triagens.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-border-strong text-[11px] text-amber-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auditoria & Rotinas
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
