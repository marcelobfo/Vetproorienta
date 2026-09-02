'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EsqueciSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      const cleanOrigin = appUrl ? appUrl.replace(/\/+$/, '') : window.location.origin.replace(':3002', '');
      const redirectTarget = `${cleanOrigin}/redefinir-senha`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTarget,
      });

      if (error) throw error;
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao tentar enviar o e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/10 via-brand-bg to-brand-bg h-[600px]" />
      
      <div className="w-full max-w-md bg-brand-surface border border-brand-border-strong rounded-[24px] p-8 relative z-10 shadow-2xl">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[12px] text-brand-text-muted hover:text-brand-text mb-6 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o login
        </Link>

        <h2 className="font-display text-2xl font-bold mb-2">Esqueci minha senha</h2>
        <p className="text-brand-text-muted text-sm mb-8">
          Digite seu e-mail abaixo e enviaremos um link para você redefinir sua senha.
        </p>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-brand-teal/10 border border-brand-teal/30 text-brand-teal text-sm px-4 py-4 rounded-xl mb-6 text-center">
            <p className="font-bold mb-1">E-mail enviado!</p>
            <p>Verifique sua caixa de entrada e clique no link para redefinir sua senha.</p>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">E-mail cadastrado</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input required name="email" type="email" placeholder="voce@email.com" className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-brand-teal text-brand-bg px-4 py-3.5 rounded-xl font-bold text-[14px] hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link de recuperação'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
