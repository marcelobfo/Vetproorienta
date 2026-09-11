import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id?: string | null): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * GET /api/chat/sessions
 * Lista as sessões de chat com mensagens
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const petId = searchParams.get('petId');

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, sessions: [], source: 'supabase_not_configured' });
    }

    const adminClient = getSupabaseAdminClient() || getSupabaseClient();

    // 1. Buscar sessões com query desacoplada (evita falha por PostgREST relation cache)
    let query = adminClient
      .from('chat_sessions')
      .select('*')
      .order('updated_at', { ascending: false });

    if (sessionId && isValidUUID(sessionId)) {
      query = query.eq('id', sessionId);
    } else if (petId && isValidUUID(petId)) {
      query = query.eq('pet_id', petId);
    } else if (userId && userId !== 'all' && isValidUUID(userId)) {
      // Retorna sessões do usuário e também sessões com user_id nulo (criadas antes do login ou sem auth estrita)
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data: rawSessions, error: sessionErr } = await query;

    if (sessionErr) {
      console.warn('[API chat/sessions] Erro ao buscar sessões:', sessionErr.message);
      return NextResponse.json({ success: false, error: sessionErr.message, sessions: [] }, { status: 500 });
    }

    const sessionList = rawSessions || [];
    const sessionIds = sessionList.map((s: any) => s.id).filter(isValidUUID);

    // 2. Buscar mensagens vinculadas de forma segura e desacoplada
    let messagesBySession: Record<string, any[]> = {};
    if (sessionIds.length > 0) {
      try {
        const { data: msgRows, error: msgErr } = await adminClient
          .from('chat_messages')
          .select('*')
          .in('session_id', sessionIds)
          .order('created_at', { ascending: true });

        if (!msgErr && msgRows) {
          for (const msg of msgRows) {
            if (!messagesBySession[msg.session_id]) {
              messagesBySession[msg.session_id] = [];
            }
            messagesBySession[msg.session_id].push({
              id: msg.id,
              session_id: msg.session_id,
              role: (msg.sender_type === 'ai' || msg.sender_type === 'system') ? 'model' : 'user',
              content: msg.content || '',
              image_url: msg.image_url || null,
              created_at: msg.created_at,
            });
          }
        }
      } catch (mErr) {
        console.warn('[API chat/sessions] Aviso ao buscar mensagens:', mErr);
      }
    }

    const sessions = sessionList.map((s: any) => ({
      id: s.id,
      tenant_id: s.tenant_id,
      user_id: s.user_id,
      pet_id: s.pet_id,
      tutor_name: s.tutor_name || 'Tutor',
      pet_name: s.pet_name || 'Pet',
      species: s.species || 'Cão',
      breed: s.breed || 'SRD',
      sex: s.sex || 'Não informado',
      age: s.age || 'Não informada',
      weight: s.weight || 'Não informado',
      triage_level: s.triage_level || 'verde',
      summary: s.summary,
      created_at: s.created_at,
      updated_at: s.updated_at || s.created_at,
      messages: messagesBySession[s.id] || [],
    }));

    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    console.error('[API chat/sessions GET] Erro:', err);
    return NextResponse.json({ success: false, error: err.message, sessions: [] }, { status: 500 });
  }
}

/**
 * POST /api/chat/sessions
 * Cria ou atualiza uma sessão de atendimento com suas mensagens
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionData, messages, supabaseConfig } = body;

    if (!sessionData) {
      return NextResponse.json({ success: false, error: 'Dados da sessão não informados.' }, { status: 400 });
    }

    const rawSessionId = sessionData.id;
    const finalSessionId = isValidUUID(rawSessionId) ? rawSessionId : generateUUID();
    const nowIso = new Date().toISOString();

    const rawPetId = sessionData.pet_id;
    const finalPetId = isValidUUID(rawPetId) ? rawPetId : null;

    const rawUserId = sessionData.user_id;
    const finalUserId = isValidUUID(rawUserId) ? rawUserId : null;

    const rawTenantId = sessionData.tenant_id;
    const finalTenantId = isValidUUID(rawTenantId) ? rawTenantId : null;

    const sessionPayload: any = {
      id: finalSessionId,
      user_id: finalUserId,
      pet_id: finalPetId,
      tutor_name: sessionData.tutor_name || 'Tutor',
      pet_name: sessionData.pet_name || 'Pet',
      species: sessionData.species || 'Cão',
      breed: sessionData.breed || 'SRD',
      sex: sessionData.sex || 'Não informado',
      age: sessionData.age || 'Não informada',
      weight: sessionData.weight || 'Não informado',
      triage_level: sessionData.triage_level || 'verde',
      summary: sessionData.summary || 'Atendimento de Orientação Veterinária',
      updated_at: nowIso,
    };

    if (finalTenantId) {
      sessionPayload.tenant_id = finalTenantId;
    }

    let savedSessionRecord: any = {
      ...sessionPayload,
      created_at: sessionData.created_at || nowIso,
      messages: [],
    };

    const customSupabaseUrl = supabaseConfig?.url;
    const customSupabaseKey = supabaseConfig?.serviceRoleKey || supabaseConfig?.anonKey;

    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseKey)) {
      const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseKey) || getSupabaseClient(customSupabaseUrl, customSupabaseKey);
      
      // Buscar tenant_id padrão se não fornecido
      if (!sessionPayload.tenant_id) {
        try {
          const { data: tenant } = await adminClient.from('tenants').select('id').limit(1).maybeSingle();
          if (tenant?.id) {
            sessionPayload.tenant_id = tenant.id;
          }
        } catch {
          // segue
        }
      }

      const { error: sessionError } = await adminClient
        .from('chat_sessions')
        .upsert(sessionPayload, { onConflict: 'id' });

      if (sessionError) {
        console.warn('[API chat/sessions POST] Erro ao salvar sessão:', sessionError.message);
      }

      // Salvar mensagens vinculadas
      if (Array.isArray(messages) && messages.length > 0) {
        const messageRows = messages.map((m: any) => ({
          id: isValidUUID(m.id) ? m.id : generateUUID(),
          session_id: finalSessionId,
          sender_type: (m.role === 'model' || m.role === 'ai') ? 'ai' : 'tutor',
          content: m.content || '',
          image_url: m.image_url || m.image || null,
          created_at: m.created_at || nowIso,
        }));

        const { error: msgError } = await adminClient
          .from('chat_messages')
          .upsert(messageRows, { onConflict: 'id' });

        if (msgError) {
          console.warn('[API chat/sessions POST] Erro ao salvar mensagens:', msgError.message);
        }

        savedSessionRecord.messages = messageRows.map((m: any) => ({
          id: m.id,
          session_id: finalSessionId,
          role: m.sender_type === 'ai' ? 'model' : 'user',
          content: m.content,
          image_url: m.image_url,
          created_at: m.created_at,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      data: savedSessionRecord,
    });
  } catch (err: any) {
    console.error('[API chat/sessions POST] Erro inesperado:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/sessions
 * Exclui uma sessão de atendimento
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');

    if (!sessionId || !isValidUUID(sessionId)) {
      return NextResponse.json({ success: false, error: 'ID de sessão inválido.' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      const adminClient = getSupabaseAdminClient() || getSupabaseClient();
      await adminClient.from('chat_messages').delete().eq('session_id', sessionId);
      await adminClient.from('chat_sessions').delete().eq('id', sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
