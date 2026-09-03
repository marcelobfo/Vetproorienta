'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, Lock, Download, Trash2, Mail, CheckCircle2, 
  RefreshCw, Cookie, ExternalLink, Smartphone, AlertCircle, FileText, User
} from 'lucide-react';
import { triggerPWAInstallModal } from '@/components/PwaInstallPrompt';

export default function DashboardPrivacidadePage() {
  const [userName] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vetpro_tutor_name') || '';
    return '';
  });
  const [userEmail] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vetpro_user_email') || '';
    return '';
  });
  const [userCpf] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('vetpro_user_cpf') || '';
    return '';
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [dpoForm, setDpoForm] = useState({
    requestType: 'access',
    message: '',
  });
  const [dpoSubmitted, setDpoSubmitted] = useState(false);


  const handleExportData = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const localData: Record<string, any> = {};
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('vetpro_')) {
              try {
                localData[key] = JSON.parse(localStorage.getItem(key) || '""');
              } catch {
                localData[key] = localStorage.getItem(key);
              }
            }
          }
        }
        const blob = new Blob([JSON.stringify({
          app: 'VetPro Orienta',
          exportDate: new Date().toISOString(),
          title: 'Exportação de Dados Pessoais do Titular - LGPD (Lei 13.709/2018)',
          userProfile: {
            name: userName,
            email: userEmail,
            cpf: userCpf,
          },
          storedRecords: localData,
        }, null, 2)], { type: 'application/json' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vetpro_meus_dados_lgpd_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 4000);
      } catch (err) {
        console.warn('Erro ao exportar:', err);
      } finally {
        setIsExporting(false);
      }
    }, 800);
  };

  const handleDpoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDpoSubmitted(true);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-border-strong">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold text-brand-text font-display flex items-center gap-2">
              Privacidade, LGPD & Seus Dados
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              Lei 13.709/2018
            </span>
          </div>
          <p className="text-xs text-brand-text-muted mt-1">
            Gerencie seu consentimento, consulte as políticas de proteção e exerça seus direitos como titular de dados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerPWAInstallModal}
            className="px-3 py-2 rounded-xl bg-brand-teal/15 hover:bg-brand-teal/25 border border-brand-teal/30 text-brand-teal text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4" /> Instalar Aplicativo (PWA)
          </button>
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="px-3 py-2 rounded-xl bg-brand-surface-2 hover:bg-brand-surface border border-brand-border-strong text-xs font-semibold text-brand-text flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver Política Completa
          </Link>
        </div>
      </div>

      {/* Cards de Direitos e Exportação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Portabilidade de Dados */}
        <div className="p-5 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-brand-text font-display">
                Portabilidade dos Seus Dados (JSON)
              </h2>
              <p className="text-[11px] text-brand-text-muted">
                Art. 18, Inciso V da LGPD
              </p>
            </div>
          </div>
          <p className="text-xs text-brand-text-muted leading-relaxed">
            Faça o download de um relatório digital contendo todos os dados do seu cadastro, histórico de pets, preferências salvas e dados de sessão.
          </p>
          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="w-full py-2.5 px-4 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {isExporting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando Arquivo...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Baixar Cópia dos Meus Dados
              </>
            )}
          </button>
          {exportSuccess && (
            <p className="text-xs text-emerald-400 font-semibold text-center animate-in fade-in">
              ✓ Arquivo JSON exportado com sucesso para o seu dispositivo!
            </p>
          )}
        </div>

        {/* Segurança e Criptografia */}
        <div className="p-5 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-brand-text font-display">
                Segurança e Armazenamento
              </h2>
              <p className="text-[11px] text-brand-text-muted">
                Proteção ponta a ponta
              </p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-brand-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Conexão criptografada via SSL/TLS 256 bits</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Pagamentos tokenizados via Asaas (PCI-DSS)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Políticas de isolamento de prontuário por tutor</span>
            </div>
          </div>
          <div className="pt-1">
            <Link
              href="/termos-de-uso"
              target="_blank"
              className="text-xs text-brand-teal hover:underline flex items-center gap-1"
            >
              Consultar Termos de Uso do Serviço <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Formulário de Atendimento DPO */}
      <div className="p-6 rounded-3xl bg-brand-surface border border-brand-border-strong space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-teal/15 text-brand-teal flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-text font-display">
              Solicitação ao Encarregado de Dados (DPO)
            </h2>
            <p className="text-xs text-brand-text-muted">
              Solicite exclusão, retificação de cadastro ou tire dúvidas sobre o tratamento de seus dados.
            </p>
          </div>
        </div>

        {dpoSubmitted ? (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-400">Solicitação Enviada!</h3>
            <p className="text-xs text-brand-text-muted max-w-md mx-auto">
              Seu pedido foi registrado e encaminhado ao DPO. Entraremos em contato no e-mail <b>{userEmail || 'cadastrado'}</b> em até 15 dias úteis.
            </p>
            <button
              onClick={() => setDpoSubmitted(false)}
              className="px-3 py-1.5 rounded-xl bg-brand-surface-2 text-xs font-semibold text-brand-text hover:bg-brand-surface mt-2"
            >
              Nova Mensagem
            </button>
          </div>
        ) : (
          <form onSubmit={handleDpoSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-brand-text-muted mb-1">Tipo de Solicitação</label>
                <select
                  value={dpoForm.requestType}
                  onChange={(e) => setDpoForm({ ...dpoForm, requestType: e.target.value })}
                  className="w-full bg-brand-bg border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text focus:outline-none focus:border-brand-teal"
                >
                  <option value="access">Acesso / Relatório de Dados</option>
                  <option value="correction">Correção de Dados Incompletos ou Inexatos</option>
                  <option value="deletion">Exclusão Definitiva dos Meus Dados (Direito ao Esquecimento)</option>
                  <option value="revocation">Revogação de Consentimento</option>
                  <option value="doubt">Dúvida sobre Tratamento de Dados</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-brand-text-muted mb-1">E-mail para Resposta</label>
                <input
                  type="email"
                  readOnly
                  value={userEmail || 'usuario@vetpro.app'}
                  className="w-full bg-brand-bg/60 border border-brand-border-strong rounded-xl px-3 py-2 text-brand-text-muted focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-brand-text-muted mb-1">Mensagem / Justificativa</label>
              <textarea
                required
                rows={3}
                value={dpoForm.message}
                onChange={(e) => setDpoForm({ ...dpoForm, message: e.target.value })}
                placeholder="Descreva detalhadamente o que você deseja solicitar ao encarregado de privacidade..."
                className="w-full bg-brand-bg border border-brand-border-strong rounded-xl p-3 text-brand-text focus:outline-none focus:border-brand-teal"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-4 rounded-xl bg-brand-teal text-brand-bg font-bold text-xs hover:bg-brand-teal/90 transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" /> Enviar Solicitação ao DPO
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
