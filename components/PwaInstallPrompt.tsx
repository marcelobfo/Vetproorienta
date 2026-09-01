'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2, Sparkles } from 'lucide-react';

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Verificar se já está rodando em modo standalone (PWA instalado)
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (isStandalone) {
        // Já está no modo app instalado
        return;
      }

      // Registrar Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registrado com sucesso:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Falha ao registrar Service Worker:', err);
          });
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setIsInstallable(true);
        // Exibir banner se ainda não dispensado
        const dismissed = localStorage.getItem('vetpro_pwa_dismissed');
        if (!dismissed) {
          setShowBanner(true);
        }
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setIsInstallable(false);
        setShowBanner(false);
        console.log('[PWA] Aplicativo VetPro instalado com sucesso!');
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar no iOS: toque no botão de compartilhamento (ícone com quadrado e seta para cima) e selecione "Adicionar à Tela de Início".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vetpro_pwa_dismissed', 'true');
    }
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-brand-surface border border-brand-teal/40 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center flex-shrink-0 shadow-sm">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold text-brand-text flex items-center gap-1.5">
              <span>Instalar Aplicativo VetPro</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </h4>
            <button
              onClick={handleDismiss}
              className="text-brand-text-muted hover:text-brand-text p-1"
              aria-label="Fechar aviso"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-brand-text-muted mt-0.5 leading-relaxed">
            Acesse o assistente veterinário, carteirinha de vacinação e rede de parceiros direto da tela inicial do seu celular.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Instalar App
            </button>
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded-lg text-[11px] text-brand-text-muted hover:text-brand-text transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
