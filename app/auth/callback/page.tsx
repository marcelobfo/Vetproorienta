'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const hash = window.location.hash.substring(1);
        const search = window.location.search;
        const searchParams = new URLSearchParams(search);
        const hashParams = new URLSearchParams(hash);

        const type = hashParams.get('type') || searchParams.get('type');
        const code = searchParams.get('code');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else if (accessToken && refreshToken) {
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
        }

        if (type === 'recovery' || hash.includes('type=recovery')) {
          router.replace(`/redefinir-senha${window.location.hash || window.location.search}`);
        } else {
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Erro no callback de autenticação:', err);
        router.replace('/login');
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6 text-brand-text">
      <Loader2 className="w-8 h-8 text-brand-teal animate-spin mb-4" />
      <p className="text-brand-text-muted text-sm">Autenticando e redirecionando...</p>
    </div>
  );
}
