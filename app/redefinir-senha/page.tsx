'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RedefinirSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Verifica se o usuário chegou aqui através do link com o token de recuperação ou código PKCE
  useEffect(() => {
    const handleAuthRedirect = async () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code);
          } catch (e) {
            console.error('Erro ao trocar código por sessão:', e);
          }
        }
      }
    };

    handleAuthRedirect();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Usuário está pronto para redefinir a senha
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/10 via-brand-bg to-brand-bg h-[600px]" />
      
      <div className="w-full max-w-md bg-brand-surface border border-brand-border-strong rounded-[24px] p-8 relative z-10 shadow-2xl">
        <h2 className="font-display text-2xl font-bold mb-2">Criar nova senha</h2>
        <p className="text-brand-text-muted text-sm mb-8">
          Digite e confirme a sua nova senha abaixo para acessar sua conta.
        </p>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-brand-teal/10 border border-brand-teal/30 text-brand-teal text-sm px-4 py-4 rounded-xl mb-6 text-center">
            <p className="font-bold mb-1">Senha atualizada com sucesso!</p>
            <p>Redirecionando você para o login...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input required name="password" type="password" minLength={6} placeholder="Mínimo 6 caracteres" className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
              </div>
            </div>
            
            <div>
              <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Confirmar nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input required name="confirmPassword" type="password" minLength={6} placeholder="Digite a senha novamente" className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-brand-teal text-brand-bg px-4 py-3.5 rounded-xl font-bold text-[14px] hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar e entrar'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
