'use client';

import { useState, useEffect } from 'react';
import { 
  Smartphone, Download, X, CheckCircle2, Sparkles, 
  Share, PlusSquare, Monitor, ArrowRight, ShieldCheck, Zap, Info
} from 'lucide-react';
import { usePWAInstall } from '@/lib/usePWAInstall';

export function triggerPWAInstallModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vetpro_open_pwa_install'));
  }
}

export function PwaInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, isAndroid, isMobile, install } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Se já está rodando em modo standalone, não mostra banner
    if (isInstalled) return;

    // Escuta evento global para abrir modal de qualquer lugar (Header, Menu, Botões)
    const handleOpenModal = () => {
      setShowModal(true);
    };
    window.addEventListener('vetpro_open_pwa_install', handleOpenModal);

    // Mostra o banner flutuante após 3 segundos caso não tenha sido fechado recentemente
    const dismissedAt = localStorage.getItem('vetpro_pwa_banner_dismissed_at');
    const dismissedRecent = dismissedAt && (Date.now() - parseInt(dismissedAt, 10)) < 1000 * 60 * 60 * 24 * 2; // 2 dias

    if (!dismissedRecent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('vetpro_open_pwa_install', handleOpenModal);
      };
    }

    return () => {
      window.removeEventListener('vetpro_open_pwa_install', handleOpenModal);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      const success = await install();
      setIsInstalling(false);
      if (success) {
        setShowBanner(false);
        setShowModal(false);
      }
    } else {
      // Abre o modal de guia interativo (especialmente para iOS Safari ou quando o navegador não expõe deferredPrompt direto)
      setShowModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vetpro_pwa_banner_dismissed_at', Date.now().toString());
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* 1. Floating Action Banner */}
      {showBanner && !showModal && (
        <div className="fixed bottom-5 right-4 left-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-brand-surface/95 backdrop-blur-md border-2 border-brand-teal/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-brand-teal text-brand-bg flex items-center justify-center flex-shrink-0 shadow-md">
              <Smartphone className="w-6 h-6 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                  <span>Instalar App VetPro Orienta</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal text-[10px] font-extrabold border border-brand-teal/30">
                    PWA
                  </span>
                </h4>
                <button
                  onClick={handleDismissBanner}
                  className="text-brand-text-muted hover:text-brand-text p-1 rounded-lg hover:bg-brand-surface-2 transition-colors"
                  aria-label="Fechar aviso"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-brand-text-muted mt-1 leading-relaxed">
                Baixe o aplicativo para acessar mais rápido, receber notificações e usar a triagem de IA direto da tela inicial.
              </p>

              <div className="flex items-center gap-2 mt-3 pt-1 border-t border-brand-border-strong/60">
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isInstallable ? 'Instalar Agora' : 'Como Baixar o App'}
                </button>
                <button
                  onClick={handleDismissBanner}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] text-brand-text-muted hover:text-brand-text transition-colors"
                >
                  Depois
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Step-by-Step Installation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-brand-surface border border-brand-teal/40 rounded-3xl p-6 shadow-2xl space-y-5 text-left relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 pr-8">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 text-brand-bg flex items-center justify-center shrink-0 shadow-lg">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-text font-display flex items-center gap-2">
                  Instalar VetPro Orienta
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-brand-text-muted">
                  Transforme a plataforma em um aplicativo nativo na sua tela de início sem gastar memória.
                </p>
              </div>
            </div>

            {/* Vantagens */}
            <div className="grid grid-cols-3 gap-2 py-2">
              <div className="p-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-center">
                <Zap className="w-4 h-4 text-brand-teal mx-auto mb-1" />
                <span className="text-[10px] font-bold text-brand-text block">Acesso Rápido</span>
                <span className="text-[9px] text-brand-text-muted">1 clique na tela</span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-brand-text block">100% Seguro</span>
                <span className="text-[9px] text-brand-text-muted">Sem lojas terceiras</span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-center">
                <Smartphone className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-brand-text block">Leve e Ágil</span>
                <span className="text-[9px] text-brand-text-muted">Economiza dados</span>
              </div>
            </div>

            {/* Platform Instructions */}
            {isInstallable ? (
              <div className="p-4 rounded-2xl bg-brand-teal/10 border border-brand-teal/30 space-y-3">
                <p className="text-xs font-semibold text-brand-teal flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Seu navegador suporta instalação instantânea!
                </p>
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3 rounded-xl bg-brand-teal text-brand-bg font-bold text-sm hover:bg-brand-teal/90 transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isInstalling ? 'Instalando aplicativo...' : 'Clique para Instalar Agora'}
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari Instructions */
              <div className="space-y-3 p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                <span className="text-xs font-bold text-brand-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-teal" />
                  Como instalar no iPhone ou iPad (Safari):
                </span>
                
                <ol className="space-y-2.5 text-xs text-brand-text-muted">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Toque no botão de <b>Compartilhar</b> <Share className="w-3.5 h-3.5 inline mx-1 text-brand-teal" /> na barra inferior do Safari.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Role as opções para baixo e selecione <b>&quot;Adicionar à Tela de Início&quot;</b> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-brand-teal" />.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Toque em <b>&quot;Adicionar&quot;</b> no canto superior direito. Pronto!
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              /* Android & Desktop Chrome / Edge Instructions */
              <div className="space-y-3 p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                <span className="text-xs font-bold text-brand-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-teal" />
                  Instalação no Android ou Computador:
                </span>
                
                <ol className="space-y-2.5 text-xs text-brand-text-muted">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Abra o menu do navegador (ícone de <b>3 pontinhos</b> <span className="font-mono text-brand-text">⋮</span> no canto superior direito).
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Clique em <b>&quot;Instalar aplicativo&quot;</b> ou <b>&quot;Adicionar à tela inicial&quot;</b>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Confirme a instalação e o ícone do <b>VetPro Orienta</b> aparecerá na sua área de trabalho ou celular.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-brand-border-strong">
              <span className="text-[11px] text-brand-text-muted flex items-center gap-1">
                <Info className="w-3.5 h-3.5" /> Compatível com Chrome, Safari, Edge e Brave.
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-bold text-brand-text transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
