'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Package, Plus, Edit2, Trash2, CheckCircle2, AlertCircle, RefreshCw, 
  Eye, EyeOff, Clock, Sparkles, Check, X, Shield, Lock, DollarSign,
  ArrowRight, ExternalLink
} from 'lucide-react';
import { SupabaseStatusBanner } from '@/components/SupabaseStatusBanner';

interface PlanFeature {
  text: string;
  strong?: boolean;
  hasLock?: boolean;
}

interface Plan {
  id: string;
  db_id?: string;
  slug?: string;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  billing_cycle?: 'MONTHLY' | 'YEARLY' | 'WEEKLY' | 'BIWEEKLY' | 'QUARTERLY' | 'SEMIANNUALLY';
  comparison_badge?: string;
  is_active: boolean;
  is_coming_soon: boolean;
  is_popular: boolean;
  plan_type: 'tutor' | 'clinic';
  features: PlanFeature[];
}

export default function AdminPlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estado do Modal de Edição / Criação
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (data.plans && Array.isArray(data.plans)) {
        setPlans(data.plans);
        if (typeof window !== 'undefined') {
          localStorage.setItem('vetpro_cached_plans', JSON.stringify(data.plans));
        }
      }
    } catch (err: any) {
      console.error('Erro ao buscar planos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleResetToCanonicals = async () => {
    if (!confirm('Deseja restaurar e limpar a lista de planos para deixar estritamente apenas os 3 oficiais (Essencial R$ 9,90, Anual R$ 59,90 e Especialista R$ 29,90)?')) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans?action=reset_defaults', {
        method: 'DELETE'
      });
      const data = await res.json();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('vetpro_cached_plans');
      }
      setFeedback({ type: 'success', message: 'Lista limpa e restaurada com sucesso para os 3 planos canônicos!' });
      await fetchPlans();
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Erro ao restaurar: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    const updated = { ...plan, is_active: !plan.is_active };
    // Atualização otimista imediata na UI
    setPlans(prev => prev.map(p => (p.id === plan.id || (plan.db_id && p.db_id === plan.db_id) ? updated : p)));
    await handleSavePlan(updated, false);
  };

  const handleToggleComingSoon = async (plan: Plan) => {
    const updated = { ...plan, is_coming_soon: !plan.is_coming_soon };
    // Atualização otimista imediata na UI
    setPlans(prev => prev.map(p => (p.id === plan.id || (plan.db_id && p.db_id === plan.db_id) ? updated : p)));
    await handleSavePlan(updated, false);
  };

  const handleOpenEdit = (plan: Plan) => {
    setEditingPlan({ ...plan, features: [...(plan.features || [])] });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingPlan({
      id: '',
      slug: '',
      name: '',
      description: '',
      price_monthly: 9.90,
      price_annual: 99.00,
      is_active: true,
      is_coming_soon: false,
      is_popular: false,
      plan_type: 'tutor',
      features: [
        { text: 'Orientação técnica pelo chat da plataforma VetPro Orienta', strong: false, hasLock: false },
        { text: 'Envio de fotos e exames para análise', strong: false, hasLock: false }
      ]
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = async (planToSave: Plan, closeModal = true) => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planToSave)
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Plano "${planToSave.name}" atualizado com sucesso!` });
        if (closeModal) setIsModalOpen(false);
        await fetchPlans();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao salvar plano' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Falha na requisição' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o plano "${name}"?`)) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Plano "${name}" removido com sucesso.` });
        await fetchPlans();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao excluir' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, { text: newFeatureText.trim(), strong: false, hasLock: false }]
    });
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingPlan) return;
    const feats = [...editingPlan.features];
    feats.splice(index, 1);
    setEditingPlan({ ...editingPlan, features: feats });
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-brand-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal text-[11px] font-bold uppercase tracking-wider">
                Gestão Comercial
              </span>
            </div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Package className="w-6 h-6 text-brand-teal" />
              Gestão Dinâmica de Planos & Preços
            </h1>
            <p className="text-brand-text-muted text-sm mt-0.5">
              Habilite, desabilite, marque como &quot;Em Breve&quot; e altere valores dos planos da Home e do Sistema.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/#planos"
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-brand-surface border border-brand-border-strong text-brand-text hover:bg-brand-surface-2 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-brand-teal" />
              <span>Ver na Página de Vendas</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Novo Plano</span>
            </button>
          </div>
        </div>

        {/* Banner Supabase */}
        <SupabaseStatusBanner />

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            feedback.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-80">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Barra Rápida de Ativação / Presets */}
        <div className="p-4 bg-brand-surface rounded-2xl border border-brand-border-strong flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-teal shrink-0" />
            <div>
              <div className="text-xs font-bold text-brand-text">Controle Rápido dos Planos da Home</div>
              <div className="text-[11px] text-brand-text-muted">
                Ative ou desative individualmente nos seletores de cada card abaixo ou aplique a configuração recomendada da Home (Essencial + Anual 59,90 + Especialista Em Breve).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={saving}
              onClick={handleResetToCanonicals}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Apaga planos duplicados/antigos e restaura apenas os 3 planos padrão"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar e Deixar Apenas os 3 Oficiais</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  // Ativa os 3 planos na configuração ideal
                  const essential = plans.find(p => (p.slug || p.id) === 'essencial');
                  const annual = plans.find(p => (p.slug || p.id) === 'anual-promocional' || (p.slug || p.id) === 'anual');
                  const specialist = plans.find(p => (p.slug || p.id) === 'especialista');

                  if (essential) await handleSavePlan({ ...essential, is_active: true, is_coming_soon: false }, false);
                  if (annual) await handleSavePlan({ ...annual, is_active: true, is_coming_soon: false, is_popular: true }, false);
                  if (specialist) await handleSavePlan({ ...specialist, is_active: true, is_coming_soon: true }, false);

                  await fetchPlans();
                  setFeedback({ type: 'success', message: 'Os 3 planos principais (Essencial, Anual 59,90 e Especialista Em Breve) foram ativados com sucesso!' });
                } catch (e: any) {
                  setFeedback({ type: 'error', message: 'Erro ao ativar planos: ' + e.message });
                } finally {
                  setSaving(false);
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ativar Todos os 3 Planos da Home</span>
            </button>
          </div>
        </div>

        {/* Lista de Planos */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-brand-teal">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs font-medium">Carregando planos...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id || plan.slug}
                className={`bg-brand-surface border rounded-2xl p-6 flex flex-col justify-between transition-all relative overflow-hidden ${
                  !plan.is_active 
                    ? 'border-brand-border-strong opacity-60 bg-brand-surface/40' 
                    : plan.is_coming_soon
                      ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
                      : plan.is_popular
                        ? 'border-brand-teal shadow-xl shadow-brand-teal/10 bg-gradient-to-b from-brand-surface to-brand-surface-2'
                        : 'border-brand-border-strong'
                }`}
              >
                {/* Badges de Status no Topo */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    {plan.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">
                        <Check className="w-3 h-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-500/15 text-zinc-400 border border-zinc-500/30 text-[10px] font-bold uppercase">
                        <EyeOff className="w-3 h-3" /> Desativado
                      </span>
                    )}

                    {plan.is_coming_soon && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                        <Clock className="w-3 h-3" /> Em Breve
                      </span>
                    )}
                  </div>

                  {plan.is_popular && (
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent-2 border border-brand-accent/30 text-[10px] font-bold uppercase">
                      Destaque
                    </span>
                  )}
                </div>

                {/* Conteúdo do Plano */}
                <div>
                  <h3 className="font-display font-bold text-xl text-brand-text mb-1 flex items-center justify-between">
                    <span>{plan.name}</span>
                    <span className="text-xs font-normal text-brand-text-muted font-mono uppercase bg-brand-surface-2 px-2 py-0.5 rounded">
                      {plan.slug || plan.id}
                    </span>
                  </h3>
                  <p className="text-xs text-brand-text-muted mb-3 leading-relaxed line-clamp-2">
                    {plan.description || 'Sem descrição cadastrada.'}
                  </p>

                  {plan.comparison_badge && (
                    <div className="mb-3 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{plan.comparison_badge}</span>
                    </div>
                  )}

                  <div className="flex items-baseline gap-1 mb-2 pb-2">
                    <span className="text-xs text-brand-text-muted font-semibold">R$</span>
                    <span className="text-3xl font-display font-extrabold text-brand-text">
                      {plan.billing_cycle === 'YEARLY' && plan.price_annual > 0 
                        ? plan.price_annual.toFixed(2).replace('.', ',') 
                        : plan.price_monthly.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-xs text-brand-text-muted">
                      {plan.billing_cycle === 'YEARLY' ? '/ano' : '/mês'}
                    </span>
                    {plan.billing_cycle === 'YEARLY' && plan.price_annual > 0 && (
                      <span className="text-[11px] text-brand-teal ml-auto font-mono font-bold">
                        (R$ {(plan.price_annual / 12).toFixed(2).replace('.', ',')}/mês)
                      </span>
                    )}
                    {plan.billing_cycle !== 'YEARLY' && plan.price_annual > 0 && (
                      <span className="text-[11px] text-brand-text-muted ml-auto font-mono">
                        ou R$ {plan.price_annual.toFixed(2).replace('.', ',')}/ano
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-border-strong text-[11px] text-brand-text-muted">
                    <span className="px-2 py-0.5 rounded bg-brand-surface-2 border border-brand-border-strong text-brand-teal font-mono">
                      Ciclo Asaas: {plan.billing_cycle || 'MONTHLY'}
                    </span>
                  </div>

                  {/* Recursos Inclusos */}
                  <div className="space-y-2 mb-6">
                    <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">
                      Recursos Inclusos ({plan.features?.length || 0}):
                    </div>
                    <ul className="space-y-1.5 text-xs text-brand-text-muted max-h-36 overflow-y-auto pr-1">
                      {plan.features?.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                          <span className={feat.strong ? 'font-bold text-brand-teal' : ''}>
                            {feat.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Controles do Plano */}
                <div className="pt-4 border-t border-brand-border-strong space-y-3">
                  {/* Interruptores Rápidos Estilo Switch Seletor */}
                  <div className="space-y-2">
                    {/* Seletor Ativo / Desativado */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                      <div className="flex items-center gap-2">
                        {plan.is_active ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-zinc-500" />}
                        <div className="text-left">
                          <div className="text-xs font-bold text-brand-text">Status na Loja</div>
                          <div className={`text-[10px] ${plan.is_active ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                            {plan.is_active ? '● Ativado (Visível)' : '○ Desativado (Oculto)'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(plan)}
                        title={plan.is_active ? 'Clique para Desativar este plano' : 'Clique para Ativar este plano'}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          plan.is_active ? 'bg-emerald-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            plan.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Seletor Em Breve vs Disponível */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong">
                      <div className="flex items-center gap-2">
                        <Clock className={`w-4 h-4 ${plan.is_coming_soon ? 'text-amber-400' : 'text-brand-text-muted'}`} />
                        <div className="text-left">
                          <div className="text-xs font-bold text-brand-text">Modo &quot;Em Breve&quot;</div>
                          <div className={`text-[10px] ${plan.is_coming_soon ? 'text-amber-400 font-semibold' : 'text-brand-text-muted'}`}>
                            {plan.is_coming_soon ? '● Bloqueado (Em Breve)' : '○ Venda Liberada'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleComingSoon(plan)}
                        title={plan.is_coming_soon ? 'Clique para liberar contratação' : 'Clique para marcar como Em Breve'}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          plan.is_coming_soon ? 'bg-amber-500' : 'bg-zinc-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            plan.is_coming_soon ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Ações de Edição e Exclusão */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(plan)}
                      className="flex-1 py-2 px-3 rounded-xl bg-brand-surface hover:bg-brand-surface-2 border border-brand-border-strong text-brand-text text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-brand-teal" />
                      <span>Configurar Detalhes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePlan(plan.db_id || plan.id, plan.name)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all"
                      title="Excluir Plano"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal de Edição / Criação de Plano */}
      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-brand-surface border border-brand-border-strong rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 text-brand-text-muted hover:text-brand-text rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs text-brand-teal font-bold mb-1">
                <Package className="w-4 h-4" /> Configuração Comercial
              </div>
              <h2 className="font-display text-xl font-bold text-brand-text">
                {editingPlan.id ? `Editar Plano: ${editingPlan.name}` : 'Criar Novo Plano'}
              </h2>
              <p className="text-xs text-brand-text-muted mt-0.5">
                Altere valores, status e os benefícios visíveis na página de vendas e na contratação.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSavePlan(editingPlan);
              }}
              className="space-y-4 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-brand-text-muted mb-1">Nome do Plano *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="Ex: Essencial, Especialista, Família Pet..."
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-brand-text-muted mb-1">Identificador (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={editingPlan.slug || editingPlan.id}
                    onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
                    placeholder="ex: essencial, especialista"
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-brand-text-muted mb-1">Descrição Curta *</label>
                <input
                  type="text"
                  required
                  value={editingPlan.description}
                  onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  placeholder="Ex: Orientação e triagem técnica pelo chat da plataforma VetPro Orienta"
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-brand-text-muted mb-1">Preço Mensal (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingPlan.price_monthly}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_monthly: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-brand-text-muted mb-1">Preço Anual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingPlan.price_annual}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price_annual: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-brand-text-muted mb-1">
                    Ciclo de Assinatura (API Asaas) *
                  </label>
                  <select
                    value={editingPlan.billing_cycle || 'MONTHLY'}
                    onChange={(e) => setEditingPlan({ ...editingPlan, billing_cycle: e.target.value as any })}
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                  >
                    <option value="MONTHLY">Mensal (Cobrança a cada mês)</option>
                    <option value="YEARLY">Anual (Cobrança a cada 12 meses)</option>
                    <option value="QUARTERLY">Trimestral (A cada 3 meses)</option>
                    <option value="SEMIANNUALLY">Semestral (A cada 6 meses)</option>
                  </select>
                  <p className="text-[10px] text-brand-text-muted mt-0.5">
                    Define o parâmetro <code className="text-brand-teal">cycle</code> enviado à API do Asaas ao gerar a assinatura.
                  </p>
                </div>

                <div>
                  <label className="block font-medium text-brand-text-muted mb-1">
                    Badge / Referência Comparativa
                  </label>
                  <input
                    type="text"
                    value={editingPlan.comparison_badge || ''}
                    onChange={(e) => setEditingPlan({ ...editingPlan, comparison_badge: e.target.value })}
                    placeholder="Ex: Mais Vendido — Economize 50% vs R$ 9,90"
                    className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-teal text-xs"
                  />
                  <p className="text-[10px] text-brand-text-muted mt-0.5">
                    Frase de destaque na vitrine comparando ao plano de R$ 9,90.
                  </p>
                </div>
              </div>

              {/* Toggles de Comportamento */}
              <div className="p-4 bg-brand-surface-2 rounded-2xl border border-brand-border-strong space-y-3">
                <div className="text-[11px] font-bold text-brand-text uppercase tracking-wider">
                  Status e Comportamento na Página de Vendas
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Seletor Ativo */}
                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border-strong flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-brand-text">Plano Ativo</div>
                      <div className={`text-[10px] ${editingPlan.is_active ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
                        {editingPlan.is_active ? 'Visível na Home' : 'Oculto na Home'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, is_active: !editingPlan.is_active })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        editingPlan.is_active ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingPlan.is_active ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Seletor Em Breve */}
                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border-strong flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-brand-text">&quot;Em Breve&quot;</div>
                      <div className={`text-[10px] ${editingPlan.is_coming_soon ? 'text-amber-400 font-semibold' : 'text-brand-text-muted'}`}>
                        {editingPlan.is_coming_soon ? 'Bloqueado' : 'Liberado'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, is_coming_soon: !editingPlan.is_coming_soon })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        editingPlan.is_coming_soon ? 'bg-amber-500' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingPlan.is_coming_soon ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Seletor Destaque */}
                  <div className="p-3 bg-brand-surface rounded-xl border border-brand-border-strong flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-brand-text">Destaque</div>
                      <div className={`text-[10px] ${editingPlan.is_popular ? 'text-brand-teal font-semibold' : 'text-brand-text-muted'}`}>
                        {editingPlan.is_popular ? 'Card em Destaque' : 'Padrão'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, is_popular: !editingPlan.is_popular })}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        editingPlan.is_popular ? 'bg-brand-teal' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          editingPlan.is_popular ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Lista de Recursos / Features */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-brand-text-muted">Itens Inclusos (Lista de Benefícios)</label>
                  <span className="text-[11px] text-brand-text-muted">{editingPlan.features.length} itens</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto p-1">
                  {editingPlan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-brand-surface-2 rounded-xl border border-brand-border-strong">
                      <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0" />
                      <input
                        type="text"
                        value={feat.text}
                        onChange={(e) => {
                          const feats = [...editingPlan.features];
                          feats[idx].text = e.target.value;
                          setEditingPlan({ ...editingPlan, features: feats });
                        }}
                        className="flex-1 bg-transparent text-xs text-brand-text focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="p-1 text-brand-text-muted hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Adicionar novo recurso */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="Novo benefício (ex: Orientação e triagem contínua...)"
                    className="flex-1 bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-4 py-2 rounded-xl bg-brand-surface-2 border border-brand-border-strong hover:bg-brand-surface text-brand-teal font-bold text-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>
              </div>

              {/* Botões do Modal */}
              <div className="pt-4 border-t border-brand-border-strong flex items-center justify-between gap-3">
                {editingPlan.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      handleDeletePlan(editingPlan.db_id || editingPlan.slug || editingPlan.id, editingPlan.name);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir este Plano
                  </button>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-brand-border-strong text-brand-text-muted hover:text-brand-text text-xs font-semibold"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-brand-teal hover:bg-brand-teal/90 text-brand-bg font-bold text-xs flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Salvar Plano
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
