import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { 
  getAsaasBaseUrl, 
  getAsaasConfig, 
  directCreateAsaasSubscription,
  resolvePlanDetails
} from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      userId, 
      email, 
      customerId, 
      currentSubscriptionId, 
      targetPlanId, 
      customPlanPrice, 
      customPlanName, 
      cpfCnpj, 
      name, 
      phone,
      asaasConfig: clientAsaasConfig,
      supabaseConfig: clientSupabaseConfig,
    } = body;

    if (!targetPlanId) {
      return NextResponse.json(
        { success: false, error: 'Identificador do plano de destino não informado.' },
        { status: 400 }
      );
    }

    const resolved = resolvePlanDetails(targetPlanId, customPlanPrice, customPlanName);
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

    let targetCustomerId = (customerId || '').trim();
    let targetEmail = (email || '').trim().toLowerCase();
    let targetUserId = userId;
    let targetName = (name || '').trim();
    let targetCpf = (cpfCnpj || '').replace(/\D/g, '');
    let targetPhone = (phone || '').replace(/\D/g, '');

    // 1. Busca dados no banco Supabase caso necessário
    const customSupabaseUrl = clientSupabaseConfig?.url;
    const customSupabaseAnonKey = clientSupabaseConfig?.anonKey;
    const customSupabaseServiceKey = clientSupabaseConfig?.serviceRoleKey;

    let adminClient: any = null;
    let supabase: any = null;

    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey)) {
      try {
        adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);

        let query = supabase.from('user_profiles').select('*');
        if (targetUserId) query = query.eq('id', targetUserId);
        else if (targetEmail) query = query.eq('email', targetEmail);

        const { data: profile } = await query.maybeSingle();
        if (profile) {
          if (!targetCustomerId && profile.asaas_customer_id) targetCustomerId = profile.asaas_customer_id;
          if (!targetEmail && profile.email) targetEmail = profile.email.toLowerCase().trim();
          if (!targetName && profile.full_name) targetName = profile.full_name.trim();
          if (!targetCpf && (profile.cpf || profile.cpf_cnpj)) targetCpf = String(profile.cpf || profile.cpf_cnpj).replace(/\D/g, '');
          if (!targetPhone && profile.phone) targetPhone = String(profile.phone).replace(/\D/g, '');
          targetUserId = profile.id;
        }
      } catch (dbErr: any) {
        console.warn('[Change Plan] Aviso ao consultar Supabase:', dbErr.message);
      }
    }

    if (!apiKey) {
      // Se não houver chave Asaas configurada no momento, atualiza apenas o banco e localStorage
      if (supabase && targetUserId) {
        await supabase.from('user_profiles').update({
          plan_id: resolved.id,
          plan_name: resolved.name,
          plan_selected: resolved.id,
          plan_price: resolved.price,
          updated_at: new Date().toISOString(),
        }).eq('id', targetUserId);
      }

      return NextResponse.json({
        success: true,
        offlineMode: true,
        planId: resolved.id,
        planName: resolved.name,
        planPrice: resolved.price,
        billingCycle: resolved.cycle,
        message: `Plano alterado para ${resolved.name} (R$ ${resolved.price.toFixed(2)}).`,
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    // 2. Se houver uma assinatura antiga, tenta cancelá-la no Asaas para não gerar cobranças duplicadas
    const oldSubId = (currentSubscriptionId || '').trim();
    if (oldSubId) {
      try {
        const delRes = await fetch(`${baseUrl}/v3/subscriptions/${oldSubId}`, {
          method: 'DELETE',
          headers,
        });
        if (delRes.ok) {
          console.log(`[Change Plan] Assinatura anterior ${oldSubId} cancelada no Asaas com sucesso.`);
        }
      } catch (delErr: any) {
        console.warn(`[Change Plan] Não foi possível cancelar assinatura antiga ${oldSubId}:`, delErr.message);
      }
    }

    // 3. Garante que temos o customerId no Asaas
    if (!targetCustomerId) {
      // Busca por email ou CPF
      if (targetEmail) {
        try {
          const sRes = await fetch(`${baseUrl}/v3/customers?email=${encodeURIComponent(targetEmail)}`, { method: 'GET', headers });
          if (sRes.ok) {
            const sJson = await sRes.json();
            const found = sJson?.data?.find((c: any) => (c.email || '').toLowerCase() === targetEmail);
            if (found?.id) targetCustomerId = found.id;
          }
        } catch (sErr) {
          console.warn('[Change Plan] Erro ao buscar customer por email:', sErr);
        }
      }
    }

    if (!targetCustomerId && targetCpf && targetCpf.length >= 11) {
      try {
        const cRes = await fetch(`${baseUrl}/v3/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: targetName || 'Tutor VetPro',
            cpfCnpj: targetCpf,
            email: targetEmail || undefined,
            mobilePhone: targetPhone || undefined,
          }),
        });
        if (cRes.ok) {
          const cJson = await cRes.json();
          if (cJson?.id) targetCustomerId = cJson.id;
        }
      } catch (cErr) {
        console.warn('[Change Plan] Erro ao criar customer no Asaas:', cErr);
      }
    }

    if (!targetCustomerId) {
      return NextResponse.json({
        success: false,
        error: 'Não foi possível identificar o cliente no Asaas para gerar a nova assinatura.',
      }, { status: 400 });
    }

    // 4. Cria a NOVA assinatura com o plano escolhido no Asaas
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    const nextDueDate = targetDate.toISOString().split('T')[0];

    const cycleText = resolved.cycle === 'YEARLY' ? 'ano' : 'mês';
    const subRes = await directCreateAsaasSubscription(
      {
        customer: targetCustomerId,
        billingType: 'UNDEFINED',
        value: resolved.price,
        nextDueDate,
        cycle: resolved.cycle,
        description: `Assinatura Plano ${resolved.name} - VetPro Orienta (R$ ${resolved.price.toFixed(2)}/${cycleText})`,
        externalReference: `sub_${resolved.id}_${targetUserId || targetCustomerId}`,
      },
      mergedAsaasConfig
    );

    if (!subRes.success || !subRes.subscription) {
      return NextResponse.json({
        success: false,
        error: subRes.error || 'Erro ao criar nova assinatura no Asaas.',
        details: subRes.details,
      }, { status: 400 });
    }

    const newSub = subRes.subscription;
    const newSubId = newSub.id;
    let paymentId = subRes.paymentId || '';
    let invoiceUrl = subRes.paymentUrl || newSub.paymentLink || '';
    let pixQrCodeImage = subRes.pixQrCodeImage || '';
    let pixCopiaECola = subRes.pixCopiaECola || '';
    let paymentDueDate = subRes.dueDate || nextDueDate;
    let bankSlipUrl = '';
    let identificationField = '';

    // Se tiver paymentId, busca dados adicionais (Boleto, Linha Digitável, Pix se faltar)
    if (paymentId) {
      try {
        const [pDetailRes, pIdentRes] = await Promise.all([
          fetch(`${baseUrl}/v3/payments/${paymentId}`, { method: 'GET', headers }),
          fetch(`${baseUrl}/v3/payments/${paymentId}/identificationField`, { method: 'GET', headers }),
        ]);

        if (pDetailRes.ok) {
          const pDetail = await pDetailRes.json();
          if (pDetail.invoiceUrl) invoiceUrl = pDetail.invoiceUrl;
          if (pDetail.bankSlipUrl) bankSlipUrl = pDetail.bankSlipUrl;
        }

        if (pIdentRes.ok) {
          const pIdent = await pIdentRes.json();
          identificationField = pIdent.identificationField || '';
        }

        if (!pixCopiaECola) {
          const pixRes = await fetch(`${baseUrl}/v3/payments/${paymentId}/pixQrCode`, { method: 'GET', headers });
          if (pixRes.ok) {
            const pixJson = await pixRes.json();
            if (pixJson.payload) {
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
            }
          }
        }
      } catch (extraErr) {
        console.warn('[Change Plan] Aviso ao buscar detalhes adicionais da fatura:', extraErr);
      }
    }

    // 5. Atualiza o perfil no Supabase
    if (supabase && targetUserId) {
      try {
        await supabase.from('user_profiles').update({
          plan_id: resolved.id,
          plan_name: resolved.name,
          plan_selected: resolved.id,
          plan_price: resolved.price,
          asaas_customer_id: targetCustomerId,
          asaas_subscription_id: newSubId,
          subscription_id: newSubId,
          subscription_status: 'PENDING_PAYMENT',
          updated_at: new Date().toISOString(),
        }).eq('id', targetUserId);
      } catch (upErr: any) {
        console.warn('[Change Plan] Aviso ao salvar no Supabase:', upErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      planId: resolved.id,
      planName: resolved.name,
      planPrice: resolved.price,
      billingCycle: resolved.cycle,
      customerId: targetCustomerId,
      subscriptionId: newSubId,
      paymentId,
      invoiceUrl,
      paymentUrl: invoiceUrl,
      bankSlipUrl,
      identificationField,
      pixQrCodeImage,
      pixCopiaECola,
      dueDate: paymentDueDate,
      value: resolved.price,
      message: `Plano alterado para ${resolved.name} com sucesso! Nova fatura no valor de R$ ${resolved.price.toFixed(2)} gerada.`,
    });
  } catch (err: any) {
    console.error('[Change Plan] Erro inesperado:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Falha interna ao processar alteração de plano.',
    }, { status: 500 });
  }
}
