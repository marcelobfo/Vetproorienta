'use client';

import { useState, useEffect } from 'react';
import { 
  Smartphone, Download, X, CheckCircle2, Sparkles, 
  Share, PlusSquare, Monitor, Laptop, Apple, ArrowRight, ShieldCheck, Zap, Info, Compass
} from 'lucide-react';
import { usePWAInstall } from '@/lib/usePWAInstall';

export function triggerPWAInstallModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vetpro_open_pwa_install'));
  }
}

export function PwaInstallPrompt() {
  const { isInstallable, isInstalled, isIOS, isMac, isSafari, isAndroid, isMobile, install } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [userSelectedTab, setUserSelectedTab] = useState<'ios' | 'mac' | 'android_pc' | null>(null);

  // Aba ativa calculada de forma pura: seleção do usuário ou detecção automática do dispositivo
  const activeTab = userSelectedTab ?? (isIOS ? 'ios' : isMac ? 'mac' : 'android_pc');
  const setActiveTab = (tab: 'ios' | 'mac' | 'android_pc') => setUserSelectedTab(tab);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Se já está rodando em modo standalone, não mostra banner
    if (isInstalled) return;

    // Escuta evento global para abrir modal de qualquer lugar (Header, Menu, Botões)
    const handleOpenModal = () => {
      setShowModal(true);
    };
    window.addEventListener('vetpro_open_pwa_install', handleOpenModal);

    // Mostra o banner flutuante após 2.5 segundos caso não tenha sido fechado recentemente
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
              {isMac ? <Laptop className="w-6 h-6 animate-pulse" /> : <Smartphone className="w-6 h-6 animate-pulse" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
                  <span>Instalar App VetPro Orienta</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-brand-teal/15 text-brand-teal text-[10px] font-extrabold border border-brand-teal/30">
                    {isMac ? 'macOS App' : isIOS ? 'iOS PWA' : 'PWA'}
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
                {isMac 
                  ? 'Adicione o VetPro ao Dock do seu MacBook ou instale como app nativo com acesso rápido.'
                  : isIOS 
                    ? 'Adicione o VetPro à Tela de Início do seu iPhone sem gastar espaço na memória.'
                    : 'Instale o aplicativo na sua área de trabalho ou celular para acesso rápido com IA.'}
              </p>

              <div className="flex items-center gap-2 mt-3 pt-1 border-t border-brand-border-strong/60">
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isInstallable ? 'Instalar Agora' : 'Como Instalar no seu Aparelho'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
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
                  Aplicativo PWA oficial compatível com iPhone, MacBook, Android e Computadores.
                </p>
              </div>
            </div>

            {/* Device Category Selector Tabs */}
            <div className="flex rounded-xl bg-brand-bg/80 p-1 border border-brand-border-strong gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ios'
                    ? 'bg-brand-teal text-brand-bg shadow-sm'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iPhone / iPad</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mac')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'mac'
                    ? 'bg-brand-teal text-brand-bg shadow-sm'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>MacBook / Mac</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('android_pc')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'android_pc'
                    ? 'bg-brand-teal text-brand-bg shadow-sm'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-surface-2'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Android / PC</span>
              </button>
            </div>

            {/* Vantagens */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-center">
                <Zap className="w-4 h-4 text-brand-teal mx-auto mb-1" />
                <span className="text-[10px] font-bold text-brand-text block">Acesso Rápido</span>
                <span className="text-[9px] text-brand-text-muted">Ícone na tela/dock</span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-brand-text block">100% Seguro</span>
                <span className="text-[9px] text-brand-text-muted">Criptografia SSL</span>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-surface-2 border border-brand-border-strong text-center">
                <Smartphone className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <span className="text-[10px] font-bold text-brand-text block">Sem Ocupar Memória</span>
                <span className="text-[9px] text-brand-text-muted">Leve e instantâneo</span>
              </div>
            </div>

            {/* Platform Instructions per Tab */}
            {isInstallable && (activeTab === 'android_pc' || (isMac && !isSafari)) ? (
              <div className="p-4 rounded-2xl bg-brand-teal/10 border border-brand-teal/30 space-y-3">
                <p className="text-xs font-semibold text-brand-teal flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Seu navegador suporta instalação direta!
                </p>
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="w-full py-3 rounded-xl bg-brand-teal text-brand-bg font-bold text-sm hover:bg-brand-teal/90 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  {isInstalling ? 'Instalando aplicativo...' : 'Clique para Instalar no seu Dispositivo'}
                </button>
              </div>
            ) : null}

            {/* TAB 1: IPHONE & IPAD (iOS) */}
            {activeTab === 'ios' && (
              <div className="space-y-3 p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-teal" />
                    Como instalar no iPhone ou iPad (Safari / Chrome):
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-bg text-brand-teal font-mono">
                    iOS 16, 17, 18+
                  </span>
                </div>

                <div className="bg-brand-bg/90 p-3 rounded-xl border border-brand-border-strong/70 text-xs space-y-2.5 text-brand-text-muted">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Abra o site no <b>Safari</b> e toque no ícone de <b>Compartilhar</b> <Share className="w-3.5 h-3.5 inline mx-1 text-brand-teal" /> na barra inferior do iPhone.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Role a lista de ações para baixo e toque em <b>&quot;Adicionar à Tela de Início&quot;</b> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-brand-teal" />.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-teal/20 text-brand-teal font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Toque em <b>&quot;Adicionar&quot;</b> no canto superior direito. O ícone oficial do <b>VetPro Orienta</b> aparecerá na tela do seu iPhone como um app nativo!
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-brand-text-muted italic flex items-center gap-1 pt-1">
                  <Info className="w-3 h-3 text-brand-teal shrink-0" />
                  No Chrome do iPhone: toque no botão de compartilhar na barra superior &gt; &quot;Adicionar à Tela Inicial&quot;.
                </p>
              </div>
            )}

            {/* TAB 2: MACBOOK / MAC (macOS) */}
            {activeTab === 'mac' && (
              <div className="space-y-3 p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-text flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-teal" />
                    Como instalar no MacBook / Mac:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-brand-bg text-brand-teal font-mono">
                    macOS Safari &amp; Chrome
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Opção Safari macOS (Adicionar ao Dock) */}
                  <div className="bg-brand-bg/90 p-3 rounded-xl border border-brand-border-strong/70 text-xs space-y-2 text-brand-text-muted">
                    <div className="flex items-center gap-1.5 text-brand-teal font-bold text-[11px]">
                      <Compass className="w-3.5 h-3.5" />
                      <span>No Safari do Mac (macOS Sonoma / Ventura):</span>
                    </div>
                    <p className="leading-relaxed">
                      1. No menu superior do Safari, clique em <b>Arquivo (File)</b> &gt; <b>&quot;Adicionar ao Dock...&quot; (Add to Dock...)</b> ou clique no ícone de <b>Compartilhar</b> <Share className="w-3.5 h-3.5 inline text-brand-teal" /> na barra de ferramentas.
                    </p>
                    <p className="leading-relaxed">
                      2. Confirme o nome <b>&quot;VetPro Orienta&quot;</b> e clique em <b>Adicionar</b>. O aplicativo fica fixado no seu Dock como app do Mac independente.
                    </p>
                  </div>

                  {/* Opção Chrome / Brave / Edge no Mac */}
                  <div className="bg-brand-bg/90 p-3 rounded-xl border border-brand-border-strong/70 text-xs space-y-2 text-brand-text-muted">
                    <div className="flex items-center gap-1.5 text-brand-teal font-bold text-[11px]">
                      <Laptop className="w-3.5 h-3.5" />
                      <span>No Google Chrome, Brave ou Edge no Mac:</span>
                    </div>
                    <p className="leading-relaxed">
                      1. Clique no ícone de <b>Instalar aplicativo</b> <Download className="w-3.5 h-3.5 inline text-brand-teal" /> localizado no lado direito da barra de endereço URL.
                    </p>
                    <p className="leading-relaxed">
                      2. Ou clique no menu <b>⋮</b> &gt; <b>Salvar e Compartilhar</b> &gt; <b>&quot;Instalar VetPro Orienta...&quot;</b>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ANDROID & WINDOWS PC */}
            {activeTab === 'android_pc' && !isInstallable && (
              <div className="space-y-3 p-4 rounded-2xl bg-brand-surface-2 border border-brand-border-strong">
                <span className="text-xs font-bold text-brand-text flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-brand-teal" />
                  Instalação no Android ou Computador Windows:
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
                <Info className="w-3.5 h-3.5 text-brand-teal" /> Otimizado para Safari (iOS &amp; Mac), Chrome e Edge.
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-brand-teal/20 hover:bg-brand-teal/30 border border-brand-teal/40 text-xs font-bold text-brand-teal transition-colors"
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

