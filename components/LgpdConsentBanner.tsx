'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cookie, Lock, CheckCircle2, ChevronRight, Settings, X, ExternalLink } from 'lucide-react';

export function LgpdConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Sempre ativo
    analytics: true,
    communication: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const consent = localStorage.getItem('vetpro_lgpd_consent');
    if (!consent) {
      // Delay pequeno para não disputar animação inicial
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    if (typeof window !== 'undefined') {
      const consentData = {
        acceptedAt: new Date().toISOString(),
        essential: true,
        analytics: true,
        communication: true,
        version: '1.0',
      };
      localStorage.setItem('vetpro_lgpd_consent', JSON.stringify(consentData));
    }
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleSavePreferences = () => {
    if (typeof window !== 'undefined') {
      const consentData = {
        acceptedAt: new Date().toISOString(),
        essential: true,
        analytics: preferences.analytics,
        communication: preferences.communication,
        version: '1.0',
      };
      localStorage.setItem('vetpro_lgpd_consent', JSON.stringify(consentData));
    }
    setShowBanner(false);
    setShowPreferences(false);
  };

  const handleRejectNonEssential = () => {
    if (typeof window !== 'undefined') {
      const consentData = {
        acceptedAt: new Date().toISOString(),
        essential: true,
        analytics: false,
        communication: false,
        version: '1.0',
      };
      localStorage.setItem('vetpro_lgpd_consent', JSON.stringify(consentData));
    }
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Barra Principal de Consentimento LGPD */}
      {!showPreferences && (
        <aside 
          aria-label="Consentimento de Cookies e Privacidade LGPD"
          className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 bg-brand-surface/95 backdrop-blur-md border-t border-brand-teal/30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 max-w-3xl">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal border border-brand-teal/30 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                    Privacidade e Proteção de Dados (LGPD)
                  </h4>
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    Lei 13.709/2018
                  </span>
                </div>
                <p className="text-[11.5px] text-brand-text-muted leading-relaxed">
                  Utilizamos cookies e tratamos dados de forma segura para autenticação de tutores, emissão de faturas no gateway bancário, personalização da triagem veterinária por IA e salvamento da carteirinha pet.
                  Ao continuar navegando, você concorda com a nossa{' '}
                  <Link href="/politica-de-privacidade" className="text-brand-teal font-semibold hover:underline inline-flex items-center gap-0.5">
                    Política de Privacidade <ExternalLink className="w-2.5 h-2.5" />
                  </Link>{' '}
                  e{' '}
                  <Link href="/termos-de-uso" className="text-brand-teal font-semibold hover:underline inline-flex items-center gap-0.5">
                    Termos de Uso
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => setShowPreferences(true)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 border border-brand-border-strong transition-all flex items-center gap-1.5"
              >
                <Settings className="w-3.5 h-3.5" />
                Preferências
              </button>
              
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-brand-text hover:bg-brand-surface-2 border border-brand-border-strong transition-all"
              >
                Apenas Essenciais
              </button>

              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-teal text-brand-bg hover:bg-brand-teal/90 transition-all shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aceitar Todos
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal de Personalização de Preferências de Privacidade */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-brand-surface border border-brand-teal/40 rounded-3xl p-6 shadow-2xl space-y-5 text-left relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowPreferences(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pr-8">
              <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal border border-brand-teal/30 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-brand-text font-display">
                  Central de Preferências de Privacidade & LGPD
                </h3>
                <p className="text-xs text-brand-text-muted">
                  Personalize quais tipos de dados e cookies você autoriza a plataforma a processar.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Essenciais */}
              <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-brand-text">Cookies Estritamente Necessários</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Obrigatório
                  </span>
                </div>
                <p className="text-[11px] text-brand-text-muted leading-relaxed">
                  Essenciais para manter sua sessão conectada, autenticar com o banco de dados Supabase, armazenar tokens seguros de sessão e processar pagamentos no Asaas.
                </p>
              </div>

              {/* Análise e Desempenho */}
              <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brand-teal" />
                    <span className="text-xs font-bold text-brand-text">Métricas & Otimização de Performance</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-brand-border-strong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-teal"></div>
                  </label>
                </div>
                <p className="text-[11px] text-brand-text-muted leading-relaxed">
                  Permite monitorar a estabilidade do sistema, velocidade das respostas da IA de triagem e usabilidade dos painéis.
                </p>
              </div>

              {/* Notificações e WhatsApp */}
              <div className="p-3.5 rounded-2xl bg-brand-surface-2 border border-brand-border-strong space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-brand-text">Comunicação e Lembretes via WhatsApp</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.communication}
                      onChange={(e) => setPreferences({ ...preferences, communication: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-brand-border-strong peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-teal"></div>
                  </label>
                </div>
                <p className="text-[11px] text-brand-text-muted leading-relaxed">
                  Autoriza o envio de confirmação de faturas, links Pix de renovação e lembretes automáticos de vacina/vermífugo pelo WhatsApp da clínica.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-brand-border-strong">
              <Link
                href="/politica-de-privacidade"
                className="text-[11px] text-brand-teal hover:underline flex items-center gap-1"
              >
                Ler Política de Privacidade Completa <ChevronRight className="w-3 h-3" />
              </Link>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-teal text-brand-bg text-xs font-bold hover:bg-brand-teal/90 transition-all shadow-md"
                >
                  Salvar Preferências
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
