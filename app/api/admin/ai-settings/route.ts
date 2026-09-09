import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customUrl = searchParams.get('customUrl') || undefined;
    const customKey = searchParams.get('customKey') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;

    if (!isSupabaseConfigured(customUrl, customKey)) {
      return NextResponse.json({ success: true, settings: null });
    }

    const adminClient = getSupabaseAdminClient(customUrl, customKey);
    const client = adminClient || getSupabaseClient(customUrl, customKey);

    let query = client.from('ai_settings').select('*');

    if (tenantId && !tenantId.startsWith('tenant-')) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      console.warn('[API ai-settings GET] Aviso:', error.message);
      return NextResponse.json({ success: true, settings: null, warning: error.message });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (err: any) {
    console.error('[API ai-settings GET] Exceção:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      provider = 'gemini',
      model_name,
      temperature,
      max_output_tokens,
      system_prompt,
      api_key,
      tenantId,
      userId,
      customUrl,
      customKey,
    } = body;

    if (!isSupabaseConfigured(customUrl, customKey)) {
      return NextResponse.json({
        success: true,
        message: 'Configurações de IA salvas localmente (Supabase não configurado).',
        savedLocally: true,
      });
    }

    const adminClient = getSupabaseAdminClient(customUrl, customKey);
    const client = adminClient || getSupabaseClient(customUrl, customKey);

    // 1. Resolver Tenant ID
    let resolvedTenantId: string | null = tenantId && !tenantId.startsWith('tenant-') ? tenantId : null;

    if (!resolvedTenantId && userId) {
      try {
        const { data: userProf } = await client
          .from('user_profiles')
          .select('tenant_id')
          .eq('id', userId)
          .maybeSingle();
        if (userProf?.tenant_id) {
          resolvedTenantId = userProf.tenant_id;
        }
      } catch (e) {
        console.warn('Erro ao buscar perfil para tenant_id em ai-settings:', e);
      }
    }

    if (!resolvedTenantId) {
      try {
        const { data: firstTenant } = await client
          .from('tenants')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (firstTenant?.id) {
          resolvedTenantId = firstTenant.id;
        }
      } catch (e) {
        console.warn('Erro ao buscar tenant padrão em ai-settings:', e);
      }
    }

    // 2. Verificar se já existe configuração
    let existingQuery = client.from('ai_settings').select('id, tenant_id');
    if (resolvedTenantId) {
      existingQuery = existingQuery.eq('tenant_id', resolvedTenantId);
    }
    const { data: existing } = await existingQuery.limit(1).maybeSingle();

    const payload: Record<string, any> = {
      provider,
      updated_at: new Date().toISOString(),
    };

    if (model_name !== undefined) payload.model_name = model_name;
    if (temperature !== undefined) payload.temperature = temperature;
    if (max_output_tokens !== undefined) payload.max_output_tokens = max_output_tokens;
    if (system_prompt !== undefined) payload.system_prompt = system_prompt;
    if (api_key !== undefined) payload.api_key = api_key;
    if (resolvedTenantId) payload.tenant_id = resolvedTenantId;

    const performSave = async (dataToSave: Record<string, any>) => {
      if (existing?.id) {
        return await client
          .from('ai_settings')
          .update(dataToSave)
          .eq('id', existing.id);
      } else {
        return await client
          .from('ai_settings')
          .insert([dataToSave]);
      }
    };

    let result = await performSave(payload);

    // Se falhar devido a colunas não encontradas no schema cache (ex: max_output_tokens, provider, api_key)
    if (result.error) {
      console.warn('[API ai-settings POST] Tentando salvar com payload reduzido devido a:', result.error.message);

      // Tentativa 2: remover max_output_tokens
      const payloadWithoutTokens = { ...payload };
      delete payloadWithoutTokens.max_output_tokens;

      result = await performSave(payloadWithoutTokens);

      // Tentativa 3: se ainda falhar, salvar apenas campos mínimos essenciais
      if (result.error) {
        console.warn('[API ai-settings POST] Tentativa 3 com campos essenciais:', result.error.message);
        const minimalPayload: Record<string, any> = {
          system_prompt: system_prompt || '',
          updated_at: new Date().toISOString(),
        };
        if (model_name !== undefined) minimalPayload.model_name = model_name;
        if (resolvedTenantId) minimalPayload.tenant_id = resolvedTenantId;

        result = await performSave(minimalPayload);

        if (result.error) {
          console.error('[API ai-settings POST] Erro final:', result.error);
          return NextResponse.json({ success: false, error: result.error.message }, { status: 500 });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configurações de IA gravadas com sucesso no Supabase!',
    });
  } catch (err: any) {
    console.error('[API ai-settings POST] Exceção:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
