'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      
      const userEmail = authData.user?.email?.toLowerCase() || '';
      const isSuperEmail = userEmail === 'marcelobfo@gmail.com' || userEmail.includes('admin@vetpro');

      // Busca perfil e papel
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, subscription_status')
        .eq('id', authData.user.id)
        .single();
        
      if (profile?.role === 'super_admin' || isSuperEmail) {
        router.push('/dashboard/super');
      } else if (profile?.role === 'admin' || profile?.role === 'veterinario') {
        router.push('/dashboard/admin');
      } else {
        // Tutor: verificar se tem status de assinatura ativa
        // O tutor tem acesso aos seus pets e triagem se estiver adimplente
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-teal/10 via-brand-bg to-brand-bg h-[600px]" />
      
      <div className="w-full max-w-md bg-brand-surface border border-brand-border-strong rounded-[24px] p-8 relative z-10 shadow-2xl">
        <Link href="/" className="flex items-center justify-center gap-2.5 font-display font-bold text-[22px] mb-8">
          <span className="w-10 h-10 rounded-xl bg-brand-accent/15 flex items-center justify-center text-[20px]">🐾</span>
          <span>VetPro <b className="text-brand-teal">Orienta</b></span>
        </Link>

        <h2 className="font-display text-xl font-bold mb-2 text-center">
          Acesso à Plataforma
        </h2>
        <p className="text-brand-text-muted text-sm text-center mb-8">
          Acesse seu painel com sua conta cadastrada.
        </p>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div>
            <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input 
                required 
                name="email" 
                type="email" 
                placeholder="seu.email@exemplo.com" 
                className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-teal transition-colors text-[14px]" 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input 
                required 
                name="password" 
                type="password" 
                placeholder="••••••••" 
                minLength={6} 
                className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-teal transition-colors text-[14px]" 
              />
            </div>
          </div>

          <div className="flex justify-end -mt-2">
            <Link href="/esqueci-senha" className="text-[12px] text-brand-teal hover:underline font-medium">
              Esqueci minha senha
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-brand-teal text-brand-bg px-4 py-3.5 rounded-xl font-bold text-[14px] hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar no Painel'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Informação sobre cadastro restrito */}
        <div className="mt-8 pt-6 border-t border-brand-border-strong flex items-start gap-3 bg-brand-surface-2/40 p-4 rounded-xl text-xs text-brand-text-muted">
          <ShieldAlert className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-brand-text block mb-0.5">Novo por aqui?</span>
            O cadastro de novos tutores e clínicas é realizado através da adesão a um dos <Link href="/#planos" className="text-brand-teal hover:underline font-medium">planos da plataforma</Link> ou convite interno do administrador.
          </div>
        </div>
      </div>
    </div>
  );
}
