'use client';

import { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Key, ExternalLink, X, Settings2 } from 'lucide-react';
import { isSupabaseConfigured, testSupabaseConnection } from '@/lib/supabase';

export function SupabaseStatusBanner() {
  const [configured, setConfigured] = useState<boolean>(() => isSupabaseConfigured());
  const [testing, setTesting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ success?: boolean; text: string } | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_supabase_url') || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    }
    return process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  });
  const [supabaseKey, setSupabaseKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vetpro_supabase_anon_key') || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    }
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  });

  const handleTest = async () => {
    setTesting(true);
    setStatusMsg(null);
    const res = await testSupabaseConnection();
    setTesting(false);
    setStatusMsg({
      success: res.success,
      text: res.message,
    });
    setConfigured(res.success);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('vetpro_supabase_url', supabaseUrl.trim());
      localStorage.setItem('vetpro_supabase_anon_key', supabaseKey.trim());
    }
    setIsConfigOpen(false);
    handleTest();
  };

  return (
    <>
      <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            configured ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
          }`}>
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-brand-text">Status do Banco Supabase:</span>
              <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] flex items-center gap-1 ${
                configured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {configured ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Conectado & Sincronizando
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Credenciais Pendentes
                  </>
                )}
              </span>
            </div>
            <div className="text-[11px] text-brand-text-muted mt-0.5">
              {statusMsg ? statusMsg.text : configured ? 'Os dados estão sendo salvos e lidos diretamente do PostgreSQL Supabase.' : 'Insira sua URL e Anon Key do Supabase para persistir tabelas e dados.'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 bg-brand-surface-2 hover:bg-brand-surface-2/80 text-brand-text border border-brand-border-strong rounded-xl transition-all flex items-center gap-1.5 font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>

          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-3 py-1.5 bg-brand-teal text-brand-bg hover:bg-brand-teal/90 rounded-xl transition-all flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Configurar Chaves
          </button>
        </div>
      </div>

      {/* Modal Configurar Supabase */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-brand-surface border border-brand-border-strong rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-brand-teal" />
                <h3 className="font-display text-lg font-bold text-brand-text">Conexão Supabase PostgreSQL</h3>
              </div>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="p-1 text-brand-text-muted hover:text-brand-text rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-brand-text-muted mb-4 leading-relaxed">
              Insira a URL e a Anon Key do seu projeto Supabase. Os dados salvos em <b>Usuários, Configurações de IA, Gestão de Módulos e Automações</b> serão gravados diretamente nas tabelas do seu Supabase.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-brand-text-muted mb-1.5">
                  Project URL (NEXT_PUBLIC_SUPABASE_URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://xyzprojectid.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl px-3.5 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-text-muted mb-1.5">
                  API Key / Anon Public Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-brand-surface-2 border border-brand-border-strong rounded-xl p-3 text-xs text-brand-text focus:outline-none focus:border-brand-teal font-mono"
                />
              </div>

              <div className="bg-brand-bg border border-brand-border-strong rounded-xl p-3 text-[11px] text-brand-text-muted space-y-1">
                <div className="font-bold text-brand-text flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> Lembrete do Banco de Dados:
                </div>
                <p>
                  Certifique-se de ter executado o script do arquivo <b>supabase-schema.sql</b> no <i>SQL Editor</i> do seu Supabase para criar todas as tabelas e políticas RLS.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border-strong">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 text-xs text-brand-text-muted hover:text-brand-text"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-brand-teal text-brand-bg font-bold px-5 py-2.5 rounded-xl text-xs hover:bg-brand-teal/90 shadow-md"
                >
                  Salvar & Conectar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
