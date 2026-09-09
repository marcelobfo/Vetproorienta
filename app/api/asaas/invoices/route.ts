import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { getAsaasBaseUrl, getAsaasConfig } from '@/lib/asaas';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || '';
    const subscriptionId = searchParams.get('subscriptionId') || '';
    const email = (searchParams.get('email') || '').trim().toLowerCase();
    const userId = searchParams.get('userId') || '';
    const limit = Number(searchParams.get('limit')) || 20;

    return await handleFetchInvoices({
      customerId,
      subscriptionId,
      email,
      userId,
      limit,
    });
  } catch (err: any) {
    console.error('Erro no GET /api/asaas/invoices:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      subscriptionId,
      email,
      userId,
      limit = 20,
      asaasConfig: clientAsaasConfig,
      supabaseConfig: clientSupabaseConfig,
    } = body;

    return await handleFetchInvoices({
      customerId,
      subscriptionId,
      email,
      userId,
      limit,
      clientAsaasConfig,
      clientSupabaseConfig,
    });
  } catch (err: any) {
    console.error('Erro no POST /api/asaas/invoices:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function handleFetchInvoices(params: {
  customerId?: string;
  subscriptionId?: string;
  email?: string;
  userId?: string;
  limit?: number;
  clientAsaasConfig?: any;
  clientSupabaseConfig?: any;
}) {
  const {
    customerId: inputCustId,
    subscriptionId: inputSubId,
    email: inputEmail,
    userId: inputUserId,
    limit = 20,
    clientAsaasConfig,
    clientSupabaseConfig,
  } = params;

  let targetCustomerId = inputCustId || '';
  let targetSubscriptionId = inputSubId || '';
  let targetEmail = (inputEmail || '').trim().toLowerCase();
  let targetUserId = inputUserId || '';

  // 1. Consulta Supabase se os dados não estiverem completos
  const customSupabaseUrl = clientSupabaseConfig?.url;
  const customSupabaseAnonKey = clientSupabaseConfig?.anonKey;
  const customSupabaseServiceKey = clientSupabaseConfig?.serviceRoleKey;

  if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey)) {
    try {
      const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
      const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);
      let query = supabase.from('user_profiles').select('*');
      if (targetUserId) query = query.eq('id', targetUserId);
      else if (targetEmail) query = query.eq('email', targetEmail);
      else if (targetCustomerId) query = query.eq('asaas_customer_id', targetCustomerId);
      else if (targetSubscriptionId) query = query.eq('asaas_subscription_id', targetSubscriptionId);

      const { data: profile } = await query.maybeSingle();
      if (profile) {
        if (profile.asaas_customer_id) targetCustomerId = profile.asaas_customer_id;
        if (profile.subscription_id || profile.asaas_subscription_id) {
          targetSubscriptionId = profile.subscription_id || profile.asaas_subscription_id;
        }
        if (!targetEmail && profile.email) targetEmail = profile.email.toLowerCase();
        if (!targetUserId) targetUserId = profile.id;
      }
    } catch (e: any) {
      console.warn('[Invoices API] Erro ao consultar Supabase:', e.message);
    }
  }

  // 2. Chave Asaas
  const mergedAsaasConfig = { ...getAsaasConfig(), ...clientAsaasConfig };
  const apiKey = (
    mergedAsaasConfig.apiKey ||
    process.env.ASAAS_API_KEY ||
    process.env.NEXT_PUBLIC_ASAAS_API_KEY ||
    process.env.ASAAS_ACCESS_TOKEN ||
    process.env.ASAAS_KEY ||
    process.env.ASAAS_TOKEN ||
    ''
  ).trim();
  const baseUrl = getAsaasBaseUrl(apiKey, mergedAsaasConfig.environment, mergedAsaasConfig.customBaseUrl);

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: 'Chave do Asaas não configurada no servidor.',
      invoices: [],
    }, { status: 400 });
  }

  const headers = {
    'Content-Type': 'application/json',
    'access_token': apiKey,
    'User-Agent': 'VetProOrienta/1.0.0',
  };

  // 3. Se não temos customerId, busca por email
  if (!targetCustomerId && targetEmail) {
    try {
      const searchRes = await fetch(`${baseUrl}/v3/customers?email=${encodeURIComponent(targetEmail)}`, { method: 'GET', headers });
      if (searchRes.ok) {
        const sJson = await searchRes.json();
        const found = sJson?.data?.find((c: any) => (c.email || '').toLowerCase() === targetEmail);
        if (found?.id) targetCustomerId = found.id;
      }
    } catch (e) {
      console.warn('[Invoices API] Erro na busca de cliente por email:', e);
    }
  }

  if (!targetCustomerId && !targetSubscriptionId) {
    return NextResponse.json({
      success: true,
      invoices: [],
      hasOverdue: false,
      overdueCount: 0,
      totalCount: 0,
      message: 'Nenhum identificador de cliente ou assinatura Asaas encontrado.',
    });
  }

  // 4. Busca faturas no Asaas
  let fetchUrl = `${baseUrl}/v3/payments?limit=${limit}&sort=dueDate&order=desc`;
  if (targetSubscriptionId) {
    fetchUrl += `&subscription=${targetSubscriptionId}`;
  } else if (targetCustomerId) {
    fetchUrl += `&customer=${targetCustomerId}`;
  }

  const paymentsRes = await fetch(fetchUrl, { method: 'GET', headers });
  if (!paymentsRes.ok) {
    const errText = await paymentsRes.text();
    return NextResponse.json({
      success: false,
      error: `Erro ao consultar faturas no Asaas: ${errText}`,
      invoices: [],
    }, { status: 502 });
  }

  const paymentsJson = await paymentsRes.json();
  const rawList: any[] = paymentsJson?.data || [];

  const todayStr = new Date().toISOString().split('T')[0];

  // Processa e normaliza faturas
  const processedInvoices = await Promise.all(
    rawList.map(async (p) => {
      const isPaid = p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH';
      const isOverdue = p.status === 'OVERDUE' || (!isPaid && p.status === 'PENDING' && p.dueDate && p.dueDate < todayStr);
      
      const invoiceUrl = p.invoiceUrl || p.paymentLink || p.bankSlipUrl || `https://www.asaas.com/i/${p.id}`;
      const bankSlipUrl = p.bankSlipUrl || '';

      // Tenta buscar Pix para a fatura se estiver pendente ou em atraso
      let pixCopiaECola = '';
      let pixQrCode = '';

      if (!isPaid) {
        try {
          const pixRes = await fetch(`${baseUrl}/v3/payments/${p.id}/pixQrCode`, { method: 'GET', headers });
          if (pixRes.ok) {
            const pixData = await pixRes.json();
            if (pixData?.payload) {
              pixCopiaECola = pixData.payload;
              try {
                pixQrCode = await QRCode.toDataURL(pixData.payload, {
                  width: 350,
                  margin: 2,
                  errorCorrectionLevel: 'M',
                  color: { dark: '#000000', light: '#ffffff' },
                });
              } catch {
                if (pixData.encodedImage) {
                  pixQrCode = pixData.encodedImage.startsWith('data:') ? pixData.encodedImage : `data:image/png;base64,${pixData.encodedImage}`;
                }
              }
            } else if (pixData?.encodedImage) {
              pixQrCode = pixData.encodedImage.startsWith('data:') ? pixData.encodedImage : `data:image/png;base64,${pixData.encodedImage}`;
            }
          }
        } catch {
          // Pix opcional por item
        }
      }

      return {
        id: p.id,
        dateCreated: p.dateCreated,
        dueDate: p.dueDate,
        originalDueDate: p.originalDueDate || p.dueDate,
        paymentDate: p.paymentDate || p.clientPaymentDate || null,
        value: Number(p.value) || 0,
        netValue: Number(p.netValue) || Number(p.value) || 0,
        billingType: p.billingType || 'UNDEFINED',
        status: isOverdue ? 'OVERDUE' : p.status,
        rawStatus: p.status,
        isPaid,
        isOverdue,
        description: p.description || 'Assinatura VetPro Orienta',
        invoiceUrl,
        bankSlipUrl,
        invoiceNumber: p.invoiceNumber || p.id,
        pixCopiaECola,
        pixQrCode,
        canBePaid: !isPaid && p.status !== 'REFUNDED' && p.status !== 'DELETED',
      };
    })
  );

  const overdueInvoices = processedInvoices.filter((inv) => inv.isOverdue);
  const pendingInvoices = processedInvoices.filter((inv) => !inv.isPaid && !inv.isOverdue && inv.canBePaid);
  const paidInvoices = processedInvoices.filter((inv) => inv.isPaid);

  const overdueTotal = overdueInvoices.reduce((acc, curr) => acc + curr.value, 0);

  return NextResponse.json({
    success: true,
    customerId: targetCustomerId,
    subscriptionId: targetSubscriptionId,
    invoices: processedInvoices,
    totalCount: processedInvoices.length,
    hasOverdue: overdueInvoices.length > 0,
    overdueCount: overdueInvoices.length,
    overdueTotal,
    overdueInvoices,
    pendingInvoices,
    paidInvoices,
  });
}
