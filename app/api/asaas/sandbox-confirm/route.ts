import { NextRequest, NextResponse } from 'next/server';
import { getAsaasBaseUrl, getAsaasApiKey } from '@/lib/asaas';
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase';

/**
 * Endpoint para aprovar/confirmar faturas de teste no Sandbox do Asaas
 * Rota: POST /api/asaas/sandbox-confirm
 * Endpoint Asaas: POST https://api-sandbox.asaas.com/v3/sandbox/payment/{id}/confirm
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      paymentId, 
      customerId, 
      subscriptionId, 
      userId, 
      email, 
      asaasConfig, 
      supabaseConfig 
    } = body;

    const apiKey = (
      asaasConfig?.apiKey || 
      req.headers.get('x-asaas-key') || 
      getAsaasApiKey() || 
      ''
    ).trim();

    const environment = asaasConfig?.environment || req.headers.get('x-asaas-environment') || 'sandbox';
    const customBaseUrl = asaasConfig?.customBaseUrl || req.headers.get('x-asaas-custom-url') || '';
    const baseUrl = getAsaasBaseUrl(apiKey, environment as any, customBaseUrl);

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Chave de API do Asaas não configurada. Configure em Asaas & Pagamentos.',
      }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    let targetPaymentId = paymentId ? String(paymentId).trim() : '';

    // Se não veio paymentId diretamente, busca a cobrança mais recente pelo customerId ou subscriptionId
    if (!targetPaymentId) {
      if (subscriptionId) {
        try {
          const subPayRes = await fetch(`${baseUrl}/v3/subscriptions/${subscriptionId}/payments?limit=5`, {
            method: 'GET',
            headers,
          });
          if (subPayRes.ok) {
            const subPayData = await subPayRes.json();
            const pendingPay = subPayData?.data?.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE') || subPayData?.data?.[0];
            if (pendingPay?.id) {
              targetPaymentId = pendingPay.id;
            }
          }
        } catch (subErr) {
          console.warn('[Sandbox Confirm] Erro ao buscar pagamentos da subscription:', subErr);
        }
      }

      if (!targetPaymentId && customerId) {
        try {
          const custPayRes = await fetch(`${baseUrl}/v3/payments?customer=${customerId}&limit=5`, {
            method: 'GET',
            headers,
          });
          if (custPayRes.ok) {
            const custPayData = await custPayRes.json();
            const pendingPay = custPayData?.data?.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE') || custPayData?.data?.[0];
            if (pendingPay?.id) {
              targetPaymentId = pendingPay.id;
            }
          }
        } catch (custErr) {
          console.warn('[Sandbox Confirm] Erro ao buscar pagamentos do customer:', custErr);
        }
      }
    }

    if (!targetPaymentId) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma fatura/cobrança pendente encontrada para aprovação no Asaas.',
      }, { status: 404 });
    }

    // Chama o endpoint de Sandbox oficial do Asaas: POST /v3/sandbox/payment/{id}/confirm
    const confirmUrl = `${baseUrl}/v3/sandbox/payment/${encodeURIComponent(targetPaymentId)}/confirm`;
    const confirmRes = await fetch(confirmUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    const confirmJson = await confirmRes.json().catch(() => null);

    if (!confirmRes.ok) {
      // Se já estava confirmado ou não é sandbox
      const errorDescription = confirmJson?.errors?.[0]?.description || confirmJson?.message || 'Falha ao confirmar no sandbox.';
      return NextResponse.json({
        success: false,
        error: errorDescription,
        details: confirmJson,
      }, { status: confirmRes.status });
    }

    // Atualiza os dados no banco de dados (Supabase user_profiles)
    const customSupabaseUrl = supabaseConfig?.url || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const customSupabaseAnonKey = supabaseConfig?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const customSupabaseServiceKey = supabaseConfig?.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY;

    let dbUpdated = false;
    if (customSupabaseUrl && (customSupabaseServiceKey || customSupabaseAnonKey)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);

        const updatePayload: any = {
          subscription_status: 'ACTIVE',
          status: 'active',
          updated_at: new Date().toISOString(),
        };

        if (confirmJson?.value) updatePayload.plan_price = confirmJson.value;

        let query = supabase.from('user_profiles').update(updatePayload);
        if (userId) {
          query = query.eq('id', userId);
        } else if (email) {
          query = query.eq('email', email.toLowerCase().trim());
        } else if (customerId) {
          query = query.eq('asaas_customer_id', customerId);
        } else if (subscriptionId) {
          query = query.eq('subscription_id', subscriptionId);
        }

        const { error: dbErr } = await query;
        if (!dbErr) dbUpdated = true;
      } catch (err) {
        console.warn('[Sandbox Confirm] Erro ao sincronizar banco:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pagamento confirmado com sucesso no Sandbox do Asaas! Assinatura ativada.',
      payment: confirmJson,
      paymentId: targetPaymentId,
      dbUpdated,
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/sandbox-confirm:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro interno ao processar confirmação de sandbox.',
    }, { status: 500 });
  }
}
