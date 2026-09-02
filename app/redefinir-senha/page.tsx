'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function RedefinirSenhaPage() {
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Processa todos os fluxos de recuperação (Hash fragment, PKCE code, token_hash OTP)
  useEffect(() => {
    let isMounted = true;

    const initRecoverySession = async () => {
      try {
        if (typeof window === 'undefined') return;

        const hash = window.location.hash.substring(1);
        const search = window.location.search;
        const searchParams = new URLSearchParams(search);
        const hashParams = new URLSearchParams(hash);

        // 1. Fluxo Implícito com fragmento Hash (#access_token=...&type=recovery)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type') || searchParams.get('type');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!sessionError) {
            if (isMounted) {
              setHasValidSession(true);
              setCheckingSession(false);
            }
            return;
          }
        }

        // 2. Fluxo PKCE (?code=...)
        const code = searchParams.get('code');
        if (code) {
          const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!codeError) {
            if (isMounted) {
              setHasValidSession(true);
              setCheckingSession(false);
            }
            return;
          }
        }

        // 3. Fluxo com token_hash (?token_hash=...&type=recovery)
        const tokenHash = searchParams.get('token_hash');
        if (tokenHash && type === 'recovery') {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (!otpError) {
            if (isMounted) {
              setHasValidSession(true);
              setCheckingSession(false);
            }
            return;
          }
        }

        // 4. Verificar se já existe uma sessão ativa
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) {
            setHasValidSession(true);
            setCheckingSession(false);
          }
          return;
        }

        // Se chegou até aqui sem sessão e sem token
        if (isMounted) {
          setCheckingSession(false);
        }
      } catch (err: any) {
        console.error('Erro ao inicializar sessão de recuperação:', err);
        if (isMounted) {
          setCheckingSession(false);
        }
      }
    };

    initRecoverySession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || session) {
        if (isMounted) {
          setHasValidSession(true);
          setCheckingSession(false);
        }
      }
    });

    return () => {
      isMounted = false;
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

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;
      
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err);
      setError(err.message || 'Ocorreu um erro ao redefinir a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden text-brand-text">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/10 via-brand-bg to-brand-bg h-[600px]" />
      
      <div className="w-full max-w-md bg-brand-surface border border-brand-border-strong rounded-[24px] p-8 relative z-10 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-brand-teal/10 border border-brand-teal/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-brand-teal">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold mb-1">Definir nova senha</h2>
          <p className="text-brand-text-muted text-sm">
            Digite sua nova senha abaixo para recuperar seu acesso.
          </p>
        </div>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-brand-teal/10 border border-brand-teal/30 text-brand-teal text-sm px-4 py-5 rounded-xl mb-6 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-brand-teal mx-auto" />
            <p className="font-bold text-base">Senha atualizada com sucesso!</p>
            <p className="text-brand-text-muted text-xs">Redirecionando você para a tela de login...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div>
              <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input 
                  required 
                  name="password" 
                  type="password" 
                  minLength={6} 
                  placeholder="Mínimo 6 caracteres" 
                  className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Confirmar nova senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input 
                  required 
                  name="confirmPassword" 
                  type="password" 
                  minLength={6} 
                  placeholder="Digite a nova senha novamente" 
                  className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" 
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full mt-4 bg-brand-teal text-brand-bg px-4 py-3.5 rounded-xl font-bold text-[14px] hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar nova senha'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-brand-border text-center">
          <a href="/login" className="text-xs text-brand-text-muted hover:text-brand-teal transition-colors">
            Voltar para o Login
          </a>
        </div>
      </div>
    </div>
  );
}
