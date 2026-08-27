'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { PawPrint, Mail, Lock, User, Building, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
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
    const name = formData.get('name') as string;
    const clinicName = formData.get('clinicName') as string;

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard/admin');
      } else {
        // Registro
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (authError) throw authError;

        if (authData.user) {
          // 1. Cria a Clínica (Tenant)
          const { data: tenant, error: tenantError } = await supabase
            .from('tenants')
            .insert([{ name: clinicName }])
            .select()
            .single();
            
          if (tenantError) throw tenantError;

          // 2. Cria o Perfil de Super Admin vinculado ao Tenant
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{
              id: authData.user.id,
              tenant_id: tenant.id,
              full_name: name,
              role: 'admin'
            }]);

          if (profileError) throw profileError;
          
          alert('Conta criada com sucesso! Faça login para continuar.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante a autenticação.');
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
          {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta (Admin)'}
        </h2>
        <p className="text-brand-text-muted text-sm text-center mb-8">
          {isLogin ? 'Acesse seu painel de controle.' : 'Comece a usar a plataforma multi-tenant.'}
        </p>

        {error && (
          <div className="bg-brand-danger/10 border border-brand-danger/30 text-brand-danger text-sm px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                  <input required name="name" type="text" placeholder="Dr. Veterinário" className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Nome da Clínica (Tenant)</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                  <input required name="clinicName" type="text" placeholder="Minha Clínica Vet" className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input required name="email" type="email" placeholder="voce@email.com" className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
            </div>
          </div>
          
          <div>
            <label className="block text-[13px] text-brand-text-muted mb-1.5 font-medium">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input required name="password" type="password" placeholder="••••••••" minLength={6} className="w-full bg-brand-surface-2 border border-brand-border-strong text-brand-text pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:border-brand-accent transition-colors text-[14px]" />
            </div>
          </div>

          {isLogin && (
            <div className="flex justify-end -mt-2">
              <Link href="/esqueci-senha" className="text-[12px] text-brand-teal hover:underline font-medium">
                Esqueci minha senha
              </Link>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 bg-brand-teal text-brand-bg px-4 py-3.5 rounded-xl font-bold text-[14px] hover:bg-brand-teal/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isLogin ? 'Entrar no Painel' : 'Criar Conta e Tenant')}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-brand-text-muted">
          {isLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?'}
          <button onClick={() => setIsLogin(!isLogin)} className="ml-1 text-brand-teal font-medium hover:underline">
            {isLogin ? 'Cadastre-se' : 'Faça login'}
          </button>
        </div>
      </div>
    </div>
  );
}
