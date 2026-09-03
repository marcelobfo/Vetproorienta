import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { 
  getAsaasBaseUrl, 
  getAsaasConfig, 
  directCreateAsaasCustomer, 
  directCreateAsaasSubscription 
} from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      customerId, 
      subscriptionId, 
      userId, 
      email, 
      name, 
      cpfCnpj, 
      phone, 
      planId, 
      planName, 
      planPrice, 
      billingType: requestedBillingType,
      forceNewCharge,
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
        error: 'Chave do Asaas não configurada. Configure a variável ASAAS_API_KEY no arquivo .env ou no Painel Admin > Asaas.',
      }, { status: 400 });
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    let targetCustomerId = customerId ? String(customerId).trim() : '';
    let targetSubscriptionId = subscriptionId ? String(subscriptionId).trim() : '';
    let targetEmail = (email || '').trim().toLowerCase();
    let targetUserId = userId;
    let targetName = (name || '').trim();
    let targetCpf = (cpfCnpj || '').replace(/\D/g, '');
    let targetPhone = (phone || '').replace(/\D/g, '');
    let selectedPlan = planId === 'especialista' ? 'especialista' : 'essencial';
    let selectedPlanName = planName || (selectedPlan === 'especialista' ? 'Especialista' : 'Essencial');
    let numericPrice = Number(planPrice) || (selectedPlan === 'especialista' ? 29.90 : 9.90);

    // 1. Tenta recuperar dados do usuário no Supabase se não fornecidos
    const customSupabaseUrl = clientSupabaseConfig?.url;
    const customSupabaseAnonKey = clientSupabaseConfig?.anonKey;
    const customSupabaseServiceKey = clientSupabaseConfig?.serviceRoleKey;

    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);

        let query = supabase.from('user_profiles').select('*');
        if (targetUserId) {
          query = query.eq('id', targetUserId);
        } else if (targetEmail) {
          query = query.eq('email', targetEmail);
        } else if (targetCpf && targetCpf.length >= 11) {
          query = query.or(`cpf.eq.${targetCpf},cpf_cnpj.eq.${targetCpf}`);
        } else if (targetCustomerId) {
          query = query.eq('asaas_customer_id', targetCustomerId);
        }

        const { data: profile } = await query.maybeSingle();
        if (profile) {
          if (profile.asaas_customer_id) {
            targetCustomerId = profile.asaas_customer_id;
          }
          if (profile.subscription_id) {
            targetSubscriptionId = profile.subscription_id;
          }
          if (!targetEmail && profile.email) targetEmail = profile.email.toLowerCase().trim();
          if (!targetName && profile.full_name) targetName = profile.full_name.trim();
          if (!targetCpf && (profile.cpf || profile.cpf_cnpj)) {
            targetCpf = String(profile.cpf || profile.cpf_cnpj).replace(/\D/g, '');
          }
          if (!targetPhone && profile.phone) targetPhone = String(profile.phone).replace(/\D/g, '');
          if (!planId && profile.plan_id) selectedPlan = profile.plan_id;
          if (!planName && (profile.plan_name || profile.plan_selected)) {
            selectedPlanName = profile.plan_name || profile.plan_selected;
          }
          targetUserId = profile.id;
        }
      } catch (dbErr: any) {
        console.warn('[Generate Invoice] Erro ao consultar perfil no Supabase:', dbErr.message);
      }
    }

    // 2. Validação rigorosa do targetCustomerId contra o Asaas
    // Evita usar um customerId de outra conta (ex: admin/Marcelo) para um tutor (ex: Fernanda Diniz)
    let validatedCustomerId = '';
    if (targetCustomerId) {
      try {
        const custCheckRes = await fetch(`${baseUrl}/v3/customers/${targetCustomerId}`, { method: 'GET', headers });
        if (custCheckRes.ok) {
          const custCheckData = await custCheckRes.json();
          const custAsaasEmail = (custCheckData?.email || '').trim().toLowerCase();
          const custAsaasCpf = (custCheckData?.cpfCnpj || '').replace(/\D/g, '');

          // Verifica se o customerId do Asaas pertence de fato ao usuário solicitado
          const emailMatches = targetEmail && custAsaasEmail && custAsaasEmail === targetEmail;
          const cpfMatches = targetCpf && custAsaasCpf && custAsaasCpf === targetCpf;

          if (emailMatches || cpfMatches || (!targetEmail && !targetCpf)) {
            validatedCustomerId = targetCustomerId;
          } else {
            console.warn(`[Generate Invoice] Descartando customerId ${targetCustomerId} (${custAsaasEmail}) pois não pertence a ${targetEmail || targetCpf}`);
            targetCustomerId = '';
            targetSubscriptionId = '';
          }
        } else {
          targetCustomerId = '';
        }
      } catch (checkErr) {
        console.warn('[Generate Invoice] Erro ao validar customerId no Asaas:', checkErr);
      }
    }

    // 3. Se não temos customerId validado, busca no Asaas por e-mail ou CPF
    if (!validatedCustomerId) {
      if (targetEmail) {
        try {
          const searchRes = await fetch(`${baseUrl}/v3/customers?email=${encodeURIComponent(targetEmail)}`, { method: 'GET', headers });
          if (searchRes.ok) {
            const searchJson = await searchRes.json();
            const found = searchJson?.data?.find((c: any) => (c.email || '').toLowerCase() === targetEmail);
            if (found?.id) {
              validatedCustomerId = found.id;
              targetCustomerId = found.id;
            }
          }
        } catch (sErr) {
          console.warn('[Generate Invoice] Erro na busca por email no Asaas:', sErr);
        }
      }

      if (!validatedCustomerId && targetCpf && targetCpf.length >= 11) {
        try {
          const searchCpfRes = await fetch(`${baseUrl}/v3/customers?cpfCnpj=${encodeURIComponent(targetCpf)}`, { method: 'GET', headers });
          if (searchCpfRes.ok) {
            const searchCpfJson = await searchCpfRes.json();
            const foundCpf = searchCpfJson?.data?.[0];
            if (foundCpf?.id) {
              validatedCustomerId = foundCpf.id;
              targetCustomerId = foundCpf.id;
            }
          }
        } catch (sCpfErr) {
          console.warn('[Generate Invoice] Erro na busca por CPF no Asaas:', sCpfErr);
        }
      }

      // 4. Se ainda não temos cliente no Asaas, cria um novo cliente exclusivo para este usuário
      if (!validatedCustomerId) {
        const finalName = targetName || (targetEmail ? targetEmail.split('@')[0] : 'Tutor VetPro');
        const custRes = await directCreateAsaasCustomer(
          {
            name: finalName,
            cpfCnpj: targetCpf || undefined,
            email: targetEmail || undefined,
            mobilePhone: targetPhone || undefined,
            externalReference: targetUserId || (targetCpf ? `tutor_${targetCpf}` : `tutor_${Date.now()}`),
          },
          mergedAsaasConfig
        );

        if (custRes.success && custRes.customer?.id) {
          validatedCustomerId = custRes.customer.id;
          targetCustomerId = custRes.customer.id;
        } else {
          return NextResponse.json({
            success: false,
            error: custRes.error || 'Não foi possível cadastrar o cliente no Asaas. Verifique se o CPF/CNPJ e e-mail são válidos.',
            details: custRes.details,
          }, { status: 400 });
        }
      }
    }

    targetCustomerId = validatedCustomerId;

    if (!targetCustomerId) {
      return NextResponse.json({
        success: false,
        error: 'Identificador do cliente no Asaas ou CPF não informado para emissão de fatura.',
      }, { status: 400 });
    }

    let invoiceUrl = '';
    let bankSlipUrl = '';
    let pixQrCodeImage = '';
    let pixCopiaECola = '';
    let identificationField = '';
    let barCode = '';
    let paymentId = '';
    let paymentDueDate = '';
    let paymentStatus = 'PENDING';
    let newSubscriptionCreated = false;

    // 3. Se não forçar nova cobrança e já tivermos cobranças em aberto, tenta reutilizar fatura pendente
    if (!forceNewCharge) {
      let fetchUrl = `${baseUrl}/v3/payments?customer=${targetCustomerId}&status=PENDING&limit=3&sort=dueDate&order=desc`;
      if (targetSubscriptionId) {
        fetchUrl = `${baseUrl}/v3/payments?subscription=${targetSubscriptionId}&status=PENDING&limit=3&sort=dueDate&order=desc`;
      }

      try {
        const existRes = await fetch(fetchUrl, { method: 'GET', headers });
        if (existRes.ok) {
          const existJson = await existRes.json();
          const firstPending = existJson?.data?.[0];

          if (firstPending) {
            paymentId = firstPending.id;
            paymentDueDate = firstPending.dueDate;
            paymentStatus = firstPending.status;
            numericPrice = firstPending.value || numericPrice;
            invoiceUrl = firstPending.invoiceUrl || firstPending.paymentLink || firstPending.bankSlipUrl || '';
            bankSlipUrl = firstPending.bankSlipUrl || '';

            // Busca Pix
            try {
              const pixRes = await fetch(`${baseUrl}/v3/payments/${paymentId}/pixQrCode`, { method: 'GET', headers });
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
            } catch (pixErr) {
              console.warn('[Generate Invoice] Falha ao recuperar QR Pix existente:', pixErr);
            }

            // Busca linha digitável
            try {
              const identRes = await fetch(`${baseUrl}/v3/payments/${paymentId}/identificationField`, { method: 'GET', headers });
              if (identRes.ok) {
                const identJson = await identRes.json();
                identificationField = identJson?.identificationField || '';
                barCode = identJson?.barCode || '';
              }
            } catch (identErr) {
              console.warn('[Generate Invoice] Falha ao recuperar linha digitável:', identErr);
            }
          }
        }
      } catch (exErr) {
        console.warn('[Generate Invoice] Erro ao buscar fatura pendente:', exErr);
      }
    }

    // 4. Se não encontrou fatura pendente ou foi solicitado gerar nova assinatura/cobrança:
    if (!paymentId || forceNewCharge) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); // Vencimento em 1 dia
      const nextDueDate = targetDate.toISOString().split('T')[0];

      const subRes = await directCreateAsaasSubscription(
        {
          customer: targetCustomerId,
          billingType: (requestedBillingType as any) || 'UNDEFINED',
          value: numericPrice,
          nextDueDate,
          cycle: 'MONTHLY',
          description: `Assinatura Plano ${selectedPlanName} - VetPro Orienta (R$ ${numericPrice.toFixed(2)}/mês)`,
          externalReference: `sub_${selectedPlan}_${targetUserId || targetCustomerId}`,
        },
        mergedAsaasConfig
      );

      if (subRes.success && subRes.subscription) {
        targetSubscriptionId = subRes.subscription.id;
        invoiceUrl = subRes.paymentUrl || subRes.subscription.paymentLink || '';
        pixQrCodeImage = subRes.pixQrCodeImage || '';
        pixCopiaECola = subRes.pixCopiaECola || '';
        paymentId = subRes.paymentId || '';
        paymentDueDate = subRes.dueDate || nextDueDate;
        newSubscriptionCreated = true;

        if (paymentId) {
          // Busca detalhes adicionais
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
              barCode = pIdent.barCode || '';
            }
          } catch (fetchMoreErr) {
            console.warn('[Generate Invoice] Erro ao buscar detalhes extras do pagamento:', fetchMoreErr);
          }
        }
      } else {
        return NextResponse.json({
          success: false,
          error: subRes.error || 'Erro ao gerar assinatura e fatura no Asaas.',
          details: subRes.details,
        }, { status: 400 });
      }
    }

    // 5. Atualiza registro no Supabase
    if (isSupabaseConfigured(customSupabaseUrl, customSupabaseAnonKey || customSupabaseServiceKey) && (targetUserId || targetEmail)) {
      try {
        const adminClient = getSupabaseAdminClient(customSupabaseUrl, customSupabaseServiceKey);
        const supabase = adminClient || getSupabaseClient(customSupabaseUrl, customSupabaseAnonKey);

        let updatePayload: Record<string, any> = {
          asaas_customer_id: targetCustomerId,
          subscription_id: targetSubscriptionId,
          plan_id: selectedPlan,
          plan_name: selectedPlanName,
          subscription_status: 'PENDING_PAYMENT',
          updated_at: new Date().toISOString(),
        };

        let upd = supabase.from('user_profiles').update(updatePayload);
        if (targetUserId) upd = upd.eq('id', targetUserId);
        else if (targetEmail) upd = upd.eq('email', targetEmail);

        await upd;
      } catch (dbErr: any) {
        console.warn('[Generate Invoice] Erro ao sincronizar com Supabase:', dbErr.message);
      }
    }

    // 6. Monta mensagem de WhatsApp e tenta envio via Evolution API se houver telefone
    let formattedPhone = targetPhone;
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = `55${formattedPhone}`;
    }

    const firstName = targetName ? targetName.split(' ')[0] : 'Tutor(a)';
    const waParts: string[] = [
      `🐶 *VetPro Orienta - Fatura da sua Assinatura* 🐱`,
      ``,
      `Olá, *${firstName}*! Sua fatura para o *Plano ${selectedPlanName}* (R$ ${numericPrice.toFixed(2).replace('.', ',')}/mês) foi gerada no Asaas.`,
    ];

    if (pixCopiaECola) {
      waParts.push(
        ``,
        `⚡ *PAGAMENTO INSTANTÂNEO VIA PIX:*`,
        `Copie o código abaixo e cole no seu banco (*Pix Copia e Cola*):`,
        ``,
        `\`\`\`${pixCopiaECola}\`\`\``,
        ``,
        `_(A compensação é imediata e seu acesso será liberado na hora!)_`
      );
    }

    if (invoiceUrl) {
      waParts.push(
        ``,
        `💳 *OU PAGUE COM CARTÃO / BOLETO:*`,
        `${invoiceUrl}`
      );
    }

    waParts.push(
      ``,
      `✅ Após o pagamento, seu acesso ao VetPro Orienta é liberado automaticamente!`
    );

    const waText = waParts.join('\n');
    const directWhatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(waText)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

    let whatsappSent = false;
    // Tenta envio silencioso em background se configurado
    if (formattedPhone) {
      try {
        const evoUrl = (process.env.EVOLUTION_SERVER_URL || '').replace(/\/+$/, '');
        const evoKey = process.env.EVOLUTION_API_KEY || '';
        const evoInst = 'vetpro-clinica';
        if (evoUrl && evoKey) {
          fetch(`${evoUrl}/message/sendText/${encodeURIComponent(evoInst)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: evoKey },
            body: JSON.stringify({
              number: formattedPhone,
              text: waText,
              textMessage: { text: waText },
              options: { delay: 1000, presence: 'composing' },
            }),
          }).then((r) => {
            if (r.ok) whatsappSent = true;
          }).catch(() => {});
        }
      } catch {
        // Envio silencioso opcional
      }
    }

    return NextResponse.json({
      success: true,
      customerId: targetCustomerId,
      subscriptionId: targetSubscriptionId,
      paymentId,
      paymentUrl: invoiceUrl,
      invoiceUrl,
      bankSlipUrl,
      identificationField,
      barCode,
      pixQrCodeImage,
      pixCopiaECola,
      dueDate: paymentDueDate,
      value: numericPrice,
      planName: selectedPlanName,
      status: paymentStatus,
      newSubscriptionCreated,
      whatsappUrl: directWhatsappUrl,
      whatsappMessage: waText,
      whatsappSent,
      phone: formattedPhone,
      message: 'Fatura da assinatura emitida com sucesso! Escolha pagar via Pix, Cartão de Crédito ou Boleto.',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/generate-invoice:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro interno ao gerar fatura no Asaas.',
    }, { status: 500 });
  }
}
