import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let memorySettings = {
  advantages_mode: 'benefits' // 'benefits' | 'comparison' | 'hidden'
};

function getSupabaseAdmin(req?: NextRequest) {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const headerUrl = req?.headers.get('x-supabase-url') || '';
  const headerKey = req?.headers.get('x-supabase-service-key') || req?.headers.get('x-supabase-anon-key') || '';
  const finalUrl = headerUrl || envUrl;
  const finalKey = headerKey || envKey;

  if (!finalUrl || !finalKey) return null;
  return createClient(finalUrl, finalKey, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin(req);
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('tenant_modules')
        .select('*')
        .eq('module_key', 'mod-home-benefits-mode')
        .maybeSingle();

      if (data?.settings?.mode) {
        memorySettings.advantages_mode = data.settings.mode;
      }
    }

    return NextResponse.json({
      success: true,
      settings: memorySettings
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      settings: memorySettings,
      error: err.message
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { advantages_mode } = body;

    if (advantages_mode && ['benefits', 'comparison', 'hidden'].includes(advantages_mode)) {
      memorySettings.advantages_mode = advantages_mode;
    }

    const supabaseAdmin = getSupabaseAdmin(req);
    if (supabaseAdmin) {
      try {
        const { data: tenantData } = await supabaseAdmin.from('tenants').select('id').limit(1).maybeSingle();
        const tenantId = tenantData?.id;

        if (tenantId) {
          await supabaseAdmin.from('tenant_modules').upsert({
            tenant_id: tenantId,
            module_key: 'mod-home-benefits-mode',
            enabled: memorySettings.advantages_mode !== 'hidden',
            settings: { mode: memorySettings.advantages_mode },
            updated_at: new Date().toISOString()
          }, { onConflict: 'tenant_id,module_key' });
        }
      } catch (e: any) {
        console.warn('[HomeSettings POST] Erro Supabase:', e.message);
      }
    }

    return NextResponse.json({
      success: true,
      settings: memorySettings,
      message: 'Configuração da Home atualizada com sucesso!'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
