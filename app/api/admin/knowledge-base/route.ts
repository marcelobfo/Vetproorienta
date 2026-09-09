import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customUrl = searchParams.get('customUrl') || undefined;
    const customKey = searchParams.get('customKey') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;

    if (!isSupabaseConfigured(customUrl, customKey)) {
      return NextResponse.json({ success: true, items: [] });
    }

    const adminClient = getSupabaseAdminClient(customUrl, customKey);
    const client = adminClient || getSupabaseClient(customUrl, customKey);

    let query = client.from('knowledge_base').select('*').order('created_at', { ascending: false });

    if (tenantId && !tenantId.startsWith('tenant-')) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[API knowledge-base GET] Erro ao consultar knowledge_base:', error.message);
      return NextResponse.json({ success: true, items: [], warning: error.message });
    }

    const mapped = (data || []).map((k: any) => ({
      id: k.id,
      tenantId: k.tenant_id,
      title: k.title,
      category: k.category || 'Geral',
      content: k.content,
      fileName: k.file_name,
      fileSize: k.file_size ? Number(k.file_size) : undefined,
      fileType: k.file_type,
      fileUrl: k.file_url,
      pageCount: k.page_count ? Number(k.page_count) : undefined,
      isActive: k.is_active ?? true,
      createdAt: k.created_at,
    }));

    return NextResponse.json({ success: true, items: mapped });
  } catch (err: any) {
    console.error('[API knowledge-base GET] Exceção:', err);
    return NextResponse.json({ success: false, error: err.message, items: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      category = 'Protocolos Clínicos',
      content,
      fileName,
      fileSize,
      fileType,
      fileUrl,
      pageCount,
      isActive = true,
      tenantId,
      userId,
      customUrl,
      customKey,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Título e conteúdo são obrigatórios.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured(customUrl, customKey)) {
      return NextResponse.json({
        success: true,
        message: 'Documento salvo apenas localmente (Supabase não configurado).',
        savedLocally: true,
      });
    }

    const adminClient = getSupabaseAdminClient(customUrl, customKey);
    const client = adminClient || getSupabaseClient(customUrl, customKey);

    // 1. Resolver Tenant ID de forma resiliente
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
        console.warn('Erro ao buscar perfil para tenant_id:', e);
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
        console.warn('Erro ao buscar tenant padrão:', e);
      }
    }

    // 2. Montar Payload
    const dbPayload: Record<string, any> = {
      title: title.trim(),
      category: category || 'Geral',
      content: content.trim(),
      file_name: fileName || null,
      file_size: fileSize || null,
      file_type: fileType || null,
      file_url: fileUrl || null,
      page_count: pageCount || null,
      is_active: isActive !== false,
      updated_at: new Date().toISOString(),
    };

    if (resolvedTenantId) {
      dbPayload.tenant_id = resolvedTenantId;
    }

    // 3. Executar inserção
    const { data: inserted, error: insertErr } = await client
      .from('knowledge_base')
      .insert([dbPayload])
      .select()
      .maybeSingle();

    if (insertErr) {
      console.warn('[API knowledge-base POST] Tentando fallback para colunas básicas:', insertErr.message);

      // Fallback para esquemas com colunas mínimas
      const fallbackPayload: Record<string, any> = {
        title: title.trim(),
        content: content.trim(),
      };
      if (resolvedTenantId) {
        fallbackPayload.tenant_id = resolvedTenantId;
      }

      const { data: fallbackData, error: fallbackErr } = await client
        .from('knowledge_base')
        .insert([fallbackPayload])
        .select()
        .maybeSingle();

      if (fallbackErr) {
        console.error('[API knowledge-base POST] Erro fatal no fallback:', fallbackErr);
        return NextResponse.json(
          { success: false, error: fallbackErr.message, code: fallbackErr.code },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        item: fallbackData,
        message: 'Documento salvo com campos essenciais.',
      });
    }

    return NextResponse.json({
      success: true,
      item: inserted,
      message: 'Documento RAG adicionado com sucesso ao Supabase!',
    });
  } catch (err: any) {
    console.error('[API knowledge-base POST] Exceção:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const customUrl = searchParams.get('customUrl') || undefined;
    const customKey = searchParams.get('customKey') || undefined;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do item é obrigatório.' }, { status: 400 });
    }

    if (!isSupabaseConfigured(customUrl, customKey)) {
      return NextResponse.json({ success: true, message: 'Removido localmente.' });
    }

    const adminClient = getSupabaseAdminClient(customUrl, customKey);
    const client = adminClient || getSupabaseClient(customUrl, customKey);

    const { error } = await client.from('knowledge_base').delete().eq('id', id);

    if (error) {
      console.error('[API knowledge-base DELETE] Erro:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Documento excluído com sucesso.' });
  } catch (err: any) {
    console.error('[API knowledge-base DELETE] Exceção:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, isActive, category, title, content, customUrl, customKey } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID é obrigatório.' }, { status: 400 });
    }

    if (!isSupabaseConfigured(customUrl, customKey)) {
      return NextResponse.json({ success: true, message: 'Atualizado localmente.' });
    }

    const adminClient = getSupabaseAdminClient(customUrl, customKey);
    const client = adminClient || getSupabaseClient(customUrl, customKey);

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (isActive !== undefined) updates.is_active = isActive;
    if (category !== undefined) updates.category = category;
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;

    const { error } = await client.from('knowledge_base').update(updates).eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Documento atualizado com sucesso.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
