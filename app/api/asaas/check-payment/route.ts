import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { getAsaasBaseUrl, getAsaasConfig } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, subscriptionId, email, userId, asaasConfig: clientAsaasConfig, supabaseConfig: clientSupabaseConfig } = body;

    const mergedAsaasConfig = { ...getAsaasConfig(), ...clientAsaasConfig };
    const apiKey = (mergedAsaasConfig.apiKey || process.env.ASAAS_API_KEY || '').trim();
    const baseUrl = getAsaasBaseUrl(apiKey, mergedAsaasConfig.environment, mergedAsaasConfig.customBaseUrl);

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Chave do Asaas não configurada no servidor.',
      }, { status: 400 });
    }

    let targetCustomerId = customerId;
    let targetSubscriptionId = subscriptionId;
    let targetEmail = email;
    let targetUserId = userId;

    const customSupabaseUrl = clientSupabaseConfig?.url;
    const customSupabaseAnonKey = clientSupabaseConfig?.anonKey;
    const customSupabaseServiceKey = clientSupabaseConfig?.serviceRoleKey;

    // Se temos apenas email ou userId, busca os IDs no Supabase
    if ((!targetCustomerId && !targetSubscriptionId) && isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);
        let query = supabase.from('user_profiles').select('*');
        if (targetUserId) query = query.eq('id', targetUserId);
        else if (targetEmail) query = query.eq('email', targetEmail.toLowerCase().trim());

        const { data: profile } = await query.maybeSingle();
        if (profile) {
          targetCustomerId = profile.asaas_customer_id;
          targetSubscriptionId = profile.subscription_id;
          targetUserId = profile.id;
          targetEmail = profile.email;

          // Se no Supabase já consta como ativo
          if (profile.subscription_status === 'ACTIVE' || profile.subscription_status === 'CONFIRMED' || profile.subscription_status === 'RECEIVED') {
            return NextResponse.json({
              success: true,
              paid: true,
              status: 'ACTIVE',
              planName: profile.plan_name || 'Essencial',
              message: 'Assinatura ativa e liberada!',
            });
          }
        }
      } catch (err: any) {
        console.warn('Erro ao consultar Supabase em check-payment:', err.message);
      }
    }

    if (!targetCustomerId && !targetSubscriptionId) {
      return NextResponse.json({
        success: false,
        paid: false,
        status: 'INACTIVE',
        error: 'Nenhum identificador de cliente ou assinatura Asaas encontrado.',
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    // 1. Busca cobranças no Asaas vinculadas ao cliente ou assinatura
    let activeBaseUrl = baseUrl;
    let paymentsUrl = `${activeBaseUrl}/v3/payments?limit=10&sort=dueDate&order=desc`;
    if (targetSubscriptionId) {
      paymentsUrl += `&subscription=${targetSubscriptionId}`;
    } else if (targetCustomerId) {
      paymentsUrl += `&customer=${targetCustomerId}`;
    }

    let paymentsRes = await fetch(paymentsUrl, { method: 'GET', headers });

    if (paymentsRes.status === 401 && (!mergedAsaasConfig.environment || mergedAsaasConfig.environment === 'auto')) {
      const fallbackUrl = activeBaseUrl.includes('sandbox') ? 'https://api.asaas.com' : 'https://api-sandbox.asaas.com';
      console.warn(`[Asaas check-payment] 401 no endpoint ${activeBaseUrl}. Tentando fallback em ${fallbackUrl}...`);
      let fallbackPaymentsUrl = `${fallbackUrl}/v3/payments?limit=10&sort=dueDate&order=desc`;
      if (targetSubscriptionId) {
        fallbackPaymentsUrl += `&subscription=${targetSubscriptionId}`;
      } else if (targetCustomerId) {
        fallbackPaymentsUrl += `&customer=${targetCustomerId}`;
      }
      const retryRes = await fetch(fallbackPaymentsUrl, { method: 'GET', headers });
      if (retryRes.ok || retryRes.status !== 401) {
        activeBaseUrl = fallbackUrl;
        paymentsRes = retryRes;
      }
    }

    if (!paymentsRes.ok) {
      const errText = await paymentsRes.text();
      return NextResponse.json({
        success: false,
        error: `Erro ao consultar faturas no Asaas: ${errText}`,
      }, { status: 502 });
    }

    const paymentsData = await paymentsRes.json();
    const paymentsList = paymentsData?.data || [];

    if (paymentsList.length === 0) {
      return NextResponse.json({
        success: true,
        paid: false,
        status: 'PENDING',
        message: 'Nenhuma fatura encontrada ainda.',
      });
    }

    // Verifica se alguma fatura está paga
    const paidPayment = paymentsList.find((p: any) => 
      p.status === 'RECEIVED' || p.status === 'CONFIRMED' || p.status === 'RECEIVED_IN_CASH'
    );

    if (paidPayment) {
      // Atualiza Supabase
      if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey) && (targetUserId || targetEmail || targetCustomerId)) {
        try {
          const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
          const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);
          let upd = supabase.from('user_profiles').update({
            status: 'active',
            subscription_status: 'ACTIVE',
            last_payment_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (targetUserId) upd = upd.eq('id', targetUserId);
          else if (targetEmail) upd = upd.eq('email', targetEmail);
          else if (targetCustomerId) upd = upd.eq('asaas_customer_id', targetCustomerId);

          await upd;
        } catch (dbErr: any) {
          console.warn('Erro ao atualizar Supabase após detecção de pagamento:', dbErr.message);
        }
      }

      return NextResponse.json({
        success: true,
        paid: true,
        status: 'ACTIVE',
        payment: paidPayment,
        paymentId: paidPayment.id,
        invoiceUrl: paidPayment.invoiceUrl,
        bankSlipUrl: paidPayment.bankSlipUrl,
        message: 'Pagamento confirmado com sucesso! Acesso liberado.',
      });
    }

    // Se não está paga, pega a primeira fatura pendente
    const pendingPayment = paymentsList[0];
    let pixQrCodeImage = '';
    let pixCopiaECola = '';
    let identificationField = '';
    let barCode = '';

    if (pendingPayment?.id) {
      // 1. Busca Pix
      try {
        const pixRes = await fetch(`${baseUrl}/v3/payments/${pendingPayment.id}/pixQrCode`, {
          method: 'GET',
          headers,
        });
        if (pixRes.ok) {
          const pixJson = await pixRes.json();
          if (pixJson?.payload) {
            pixCopiaECola = pixJson.payload;
            try {
              pixQrCodeImage = await QRCode.toDataURL(pixJson.payload, {
                width: 400,
                margin: 2,
                errorCorrectionLevel: 'M',
                color: { dark: '#000000', light: '#ffffff' },
              });
            } catch {
              if (pixJson.encodedImage) {
                pixQrCodeImage = pixJson.encodedImage.startsWith('data:')
                  ? pixJson.encodedImage
                  : `data:image/png;base64,${pixJson.encodedImage}`;
              }
            }
          } else if (pixJson?.encodedImage) {
            pixQrCodeImage = pixJson.encodedImage.startsWith('data:')
              ? pixJson.encodedImage
              : `data:image/png;base64,${pixJson.encodedImage}`;
          }
        }
      } catch (pixErr: any) {
        console.warn('Erro ao obter Pix QR Code em check-payment:', pixErr.message);
      }

      // 2. Busca Linha Digitável do Boleto
      try {
        const identRes = await fetch(`${baseUrl}/v3/payments/${pendingPayment.id}/identificationField`, {
          method: 'GET',
          headers,
        });
        if (identRes.ok) {
          const identJson = await identRes.json();
          identificationField = identJson?.identificationField || '';
          barCode = identJson?.barCode || '';
        }
      } catch (identErr: any) {
        console.warn('Erro ao obter linha digitável do boleto:', identErr.message);
      }
    }

    const finalInvoiceUrl = pendingPayment?.invoiceUrl || pendingPayment?.paymentLink || pendingPayment?.bankSlipUrl || '';
    const finalBankSlipUrl = pendingPayment?.bankSlipUrl || '';

    return NextResponse.json({
      success: true,
      paid: false,
      status: pendingPayment?.status || 'PENDING',
      paymentId: pendingPayment?.id,
      paymentUrl: finalInvoiceUrl,
      invoiceUrl: finalInvoiceUrl,
      bankSlipUrl: finalBankSlipUrl,
      identificationField,
      barCode,
      pixQrCodeImage,
      pixCopiaECola,
      value: pendingPayment?.value,
      dueDate: pendingPayment?.dueDate,
      billingType: pendingPayment?.billingType,
      message: 'Fatura pendente de pagamento.',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/check-payment:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro interno ao verificar pagamento.',
    }, { status: 500 });
  }
}
