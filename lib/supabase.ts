import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Obter chaves do ambiente ou do localStorage (permitindo configuração direta na UI caso env não esteja setado)
export const getCredentials = () => {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('vetpro_supabase_url');
    const localKey = localStorage.getItem('vetpro_supabase_anon_key');
    const localServiceKey = localStorage.getItem('vetpro_supabase_service_key');
    if (localUrl) url = localUrl;
    if (localKey) anonKey = localKey;
    if (localServiceKey) serviceRoleKey = localServiceKey;
  }

  return { url, anonKey, serviceRoleKey };
};

// Singleton Client Instance Cache
let cachedClient: SupabaseClient | null = null;
let cachedKey = '';

export const getSupabaseClient = (customUrl?: string, customAnonKey?: string): SupabaseClient => {
  const credentials = getCredentials();
  const url = customUrl || credentials.url || 'https://placeholder.supabase.co';
  const anonKey = customAnonKey || credentials.anonKey || 'placeholder_key';
  const cacheKey = `${url}___${anonKey}`;

  if (cachedClient && cachedKey === cacheKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined',
        detectSessionInUrl: typeof window !== 'undefined',
      },
    });
    cachedKey = cacheKey;
    return cachedClient;
  } catch (e) {
    console.error('Erro ao instanciar Supabase Client:', e);
    if (!cachedClient) {
      cachedClient = createClient('https://placeholder.supabase.co', 'placeholder_key');
    }
    return cachedClient;
  }
};

export const supabase = getSupabaseClient();

export const getSupabaseAdminClient = (customUrl?: string, customServiceKey?: string): SupabaseClient | null => {
  const credentials = getCredentials();
  const url = customUrl || credentials.url;
  const serviceKey = customServiceKey || credentials.serviceRoleKey || credentials.anonKey;

  if (url && serviceKey && !url.includes('placeholder')) {
    try {
      return createClient(url, serviceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (e) {
      console.error('Erro ao instanciar Supabase Admin Client:', e);
      return null;
    }
  }
  return null;
};

export const isSupabaseConfigured = (customUrl?: string, customKey?: string) => {
  const { url, anonKey } = getCredentials();
  const finalUrl = customUrl || url;
  const finalKey = customKey || anonKey;
  return Boolean(finalUrl && finalKey && !finalUrl.includes('placeholder'));
};

export const testSupabaseConnection = async (customUrl?: string, customKey?: string): Promise<{ success: boolean; message: string; details?: any }> => {
  try {
    const client = getSupabaseClient(customUrl, customKey);
    if (!isSupabaseConfigured(customUrl, customKey)) {
      return {
        success: false,
        message: 'Chaves do Supabase não configuradas no arquivo .env ou no painel.',
      };
    }

    // Tentar consultar tenants ou user_profiles
    const { data, error } = await client.from('tenants').select('count', { count: 'exact', head: true });
    if (error) {
      // Se a tabela não existir, testa tabela user_profiles
      const { error: profileError } = await client.from('user_profiles').select('count', { count: 'exact', head: true });
      if (profileError) {
        return {
          success: false,
          message: `Erro ao consultar Supabase: ${error.message} (Código: ${error.code})`,
          details: { tenantsError: error, profileError },
        };
      }
    }

    return {
      success: true,
      message: 'Conexão com o banco de dados Supabase realizada com sucesso!',
      details: { count: data },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na conexão: ${err.message || 'Erro desconhecido'}`,
      details: err,
    };
  }
};

