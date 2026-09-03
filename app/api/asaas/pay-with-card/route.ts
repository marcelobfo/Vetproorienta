import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { getAsaasBaseUrl, getAsaasConfig, directCreateAsaasCustomer, directCreateAsaasSubscription } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerId,
      subscriptionId,
      paymentId,
      userId,
      email,
      planId,
      planName,
      planPrice,
      card,
      holderInfo,
      asaasConfig: clientAsaasConfig,
      supabaseConfig: clientSupabaseConfig,
    } = body;

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
        error: 'Chave do Asaas não configurada no servidor. Configure a variável ASAAS_API_KEY no arquivo .env ou no Painel Admin > Asaas.',
      }, { status: 400 });
    }

    if (!card || !card.number || !card.holderName || !card.expiryMonth || !card.expiryYear || !card.ccv) {
      return NextResponse.json({
        success: false,
        error: 'Preencha todos os dados do cartão de crédito (número, nome, mês, ano e CVV).',
      }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    let targetCustomerId = customerId;
    let targetSubscriptionId = subscriptionId;
    let targetPaymentId = paymentId;
    let targetEmail = (email || holderInfo?.email || '').trim().toLowerCase();
    let targetUserId = userId;
    let selectedPlan = planId === 'especialista' ? 'especialista' : 'essencial';
    let selectedPlanName = planName || (selectedPlan === 'especialista' ? 'Especialista' : 'Essencial');
    let numericPrice = Number(planPrice) || (selectedPlan === 'especialista' ? 29.90 : 9.90);

    const customSupabaseUrl = clientSupabaseConfig?.url;
    const customSupabaseAnonKey = clientSupabaseConfig?.anonKey;
    const customSupabaseServiceKey = clientSupabaseConfig?.serviceRoleKey;

    // Se faltar dados do usuário, busca no Supabase
    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);
        let query = supabase.from('user_profiles').select('*');
        if (targetUserId) query = query.eq('id', targetUserId);
        else if (targetEmail) query = query.eq('email', targetEmail);

        const { data: profile } = await query.maybeSingle();
        if (profile) {
          if (!targetCustomerId && profile.asaas_customer_id) targetCustomerId = profile.asaas_customer_id;
          if (!targetSubscriptionId && profile.subscription_id) targetSubscriptionId = profile.subscription_id;
          if (!targetEmail && profile.email) targetEmail = profile.email;
          targetUserId = profile.id;
        }
      } catch (dbErr: any) {
        console.warn('[Pay With Card] Erro ao consultar Supabase:', dbErr.message);
      }
    }

    const cleanCardNumber = card.number.replace(/\D/g, '');
    const cleanCpf = (holderInfo?.cpfCnpj || '').replace(/\D/g, '');
    const cleanPhone = (holderInfo?.phone || holderInfo?.mobilePhone || '').replace(/\D/g, '');
    const cleanPostalCode = (holderInfo?.postalCode || '01310100').replace(/\D/g, '');

    // 1. Garante que o cliente existe no Asaas
    if (!targetCustomerId) {
      const custName = holderInfo?.name || card.holderName || (targetEmail ? targetEmail.split('@')[0] : 'Tutor VetPro');
      const custRes = await directCreateAsaasCustomer(
        {
          name: custName,
          cpfCnpj: cleanCpf || '00000000000',
          email: targetEmail || undefined,
          mobilePhone: cleanPhone || undefined,
          externalReference: targetUserId || `tutor_card_${Date.now()}`,
        },
        mergedAsaasConfig
      );

      if (custRes.success && custRes.customer?.id) {
        targetCustomerId = custRes.customer.id;
      } else {
        return NextResponse.json({
          success: false,
          error: custRes.error || 'Erro ao cadastrar cliente no Asaas para pagamento com cartão.',
          details: custRes.details,
        }, { status: 400 });
      }
    }

    // 2. Se não temos paymentId pendente, busca ou cria a assinatura/cobrança
    if (!targetPaymentId) {
      if (targetSubscriptionId) {
        try {
          const pRes = await fetch(`${baseUrl}/v3/payments?subscription=${targetSubscriptionId}&status=PENDING&limit=1`, { method: 'GET', headers });
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData?.data?.[0]?.id) {
              targetPaymentId = pData.data[0].id;
            }
          }
        } catch (fErr) {
          console.warn('[Pay With Card] Erro ao buscar cobrança da assinatura:', fErr);
        }
      }

      if (!targetPaymentId && targetCustomerId) {
        try {
          const pRes = await fetch(`${baseUrl}/v3/payments?customer=${targetCustomerId}&status=PENDING&limit=1`, { method: 'GET', headers });
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData?.data?.[0]?.id) {
              targetPaymentId = pData.data[0].id;
            }
          }
        } catch (fErr) {
          console.warn('[Pay With Card] Erro ao buscar cobrança do cliente:', fErr);
        }
      }
    }

    // 3. Se ainda não há paymentId, cria nova assinatura mensal
    if (!targetPaymentId) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      const nextDueDate = targetDate.toISOString().split('T')[0];

      const subRes = await directCreateAsaasSubscription(
        {
          customer: targetCustomerId,
          billingType: 'CREDIT_CARD',
          value: numericPrice,
          nextDueDate,
          cycle: 'MONTHLY',
          description: `Assinatura Plano ${selectedPlanName} - VetPro Orienta (Cartão)`,
          externalReference: `sub_card_${selectedPlan}_${targetUserId || targetCustomerId}`,
        },
        mergedAsaasConfig
      );

      if (subRes.success && subRes.subscription) {
        targetSubscriptionId = subRes.subscription.id;
        targetPaymentId = subRes.paymentId || '';
      } else {
        return NextResponse.json({
          success: false,
          error: subRes.error || 'Erro ao criar assinatura no Asaas.',
          details: subRes.details,
        }, { status: 400 });
      }
    }

    if (!targetPaymentId) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível localizar ou gerar a fatura para cobrança do cartão.',
      }, { status: 400 });
    }

    // 4. Executa pagamento via cartão na API do Asaas (/v3/payments/{id}/payWithCreditCard)
    const cardPayload = {
      creditCard: {
        holderName: card.holderName.trim(),
        number: cleanCardNumber,
        expiryMonth: card.expiryMonth.toString().padStart(2, '0'),
        expiryYear: card.expiryYear.toString().length === 2 ? `20${card.expiryYear}` : card.expiryYear.toString(),
        ccv: card.ccv.toString().trim(),
      },
      creditCardHolderInfo: {
        name: (holderInfo?.name || card.holderName).trim(),
        email: (holderInfo?.email || targetEmail || 'tutor@vetpro-orienta.app').trim(),
        cpfCnpj: cleanCpf || '00000000000',
        postalCode: cleanPostalCode || '01310100',
        addressNumber: (holderInfo?.addressNumber || '1').toString().trim(),
        addressComplement: holderInfo?.addressComplement || '',
        phone: cleanPhone || '11999999999',
        mobilePhone: cleanPhone || '11999999999',
      },
    };

    const payRes = await fetch(`${baseUrl}/v3/payments/${targetPaymentId}/payWithCreditCard`, {
      method: 'POST',
      headers,
      body: JSON.stringify(cardPayload),
    });

    const payJson = await payRes.json();

    if (!payRes.ok) {
      let errorMsg = 'Erro ao processar pagamento com cartão de crédito.';
      if (Array.isArray(payJson?.errors) && payJson.errors.length > 0) {
        errorMsg = payJson.errors.map((e: any) => e.description || e.code).join(' | ');
      } else if (payJson?.message) {
        errorMsg = payJson.message;
      }
      return NextResponse.json({
        success: false,
        error: errorMsg,
        details: payJson,
      }, { status: 400 });
    }

    const isPaid = payJson.status === 'CONFIRMED' || payJson.status === 'RECEIVED' || payJson.status === 'RECEIVED_IN_CASH';

    // 5. Atualiza Supabase com sucesso
    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey) && (targetUserId || targetEmail)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);

        const updateData: Record<string, any> = {
          asaas_customer_id: targetCustomerId,
          subscription_id: targetSubscriptionId,
          plan_id: selectedPlan,
          plan_name: selectedPlanName,
          status: isPaid ? 'active' : 'pending',
          subscription_status: isPaid ? 'ACTIVE' : (payJson.status || 'PENDING'),
          updated_at: new Date().toISOString(),
        };

        if (isPaid) {
          updateData.last_payment_date = new Date().toISOString();
        }

        let upd = supabase.from('user_profiles').update(updateData);
        if (targetUserId) upd = upd.eq('id', targetUserId);
        else if (targetEmail) upd = upd.eq('email', targetEmail);

        await upd;
      } catch (dbErr: any) {
        console.warn('[Pay With Card] Erro ao atualizar Supabase:', dbErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      paid: isPaid,
      status: payJson.status || (isPaid ? 'ACTIVE' : 'PENDING'),
      paymentId: payJson.id || targetPaymentId,
      customerId: targetCustomerId,
      subscriptionId: targetSubscriptionId,
      lastDigits: cleanCardNumber.slice(-4),
      message: isPaid
        ? 'Pagamento com cartão de crédito confirmado com sucesso! Acesso liberado.'
        : 'Pagamento enviado para processamento.',
      details: payJson,
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/pay-with-card:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro interno ao processar pagamento com cartão.',
    }, { status: 500 });
  }
}
