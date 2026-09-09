import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { getEvolutionConfig } from '@/lib/evolution';
import { getAsaasBaseUrl, getAsaasConfig } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phone,
      name,
      customerName,
      email,
      planName,
      planPrice,
      paymentId,
      invoiceNumber,
      pixCopiaECola: initialPix,
      paymentUrl: initialPaymentUrl,
      invoiceUrl: initialInvoiceUrl,
      bankSlipUrl: initialBankSlipUrl,
      dueDate,
      status: paymentStatus,
      isOverdue: initialIsOverdue,
      customMessage,
      serverUrl: clientServerUrl,
      apiKey: clientApiKey,
      instanceName: clientInstanceName,
      asaasConfig: clientAsaasConfig,
    } = body;

    let targetPhone = (phone || '').toString().replace(/\D/g, '');
    let targetName = (name || customerName || '').trim();
    let targetPlanName = planName || 'Essencial';
    let targetPlanPrice = Number(planPrice) || 9.90;
    let targetPaymentId = paymentId || invoiceNumber || '';
    let pixCopiaECola = initialPix || '';
    let invoiceUrl = initialInvoiceUrl || initialPaymentUrl || '';
    let bankSlipUrl = initialBankSlipUrl || '';
    let resolvedDueDate = dueDate || '';
    let isOverdue = initialIsOverdue || paymentStatus === 'OVERDUE';

    // 1. Se temos o paymentId mas faltam o link do Asaas ou o Pix, busca no Asaas diretamente
    if (targetPaymentId) {
      try {
        const mergedAsaasConfig = { ...getAsaasConfig(), ...clientAsaasConfig };
        const asaasKey = (
          mergedAsaasConfig.apiKey ||
          process.env.ASAAS_API_KEY ||
          process.env.NEXT_PUBLIC_ASAAS_API_KEY ||
          process.env.ASAAS_ACCESS_TOKEN ||
          process.env.ASAAS_KEY ||
          process.env.ASAAS_TOKEN ||
          ''
        ).trim();
        const baseUrl = getAsaasBaseUrl(asaasKey, mergedAsaasConfig.environment, mergedAsaasConfig.customBaseUrl);

        if (asaasKey) {
          const headers = {
            'Content-Type': 'application/json',
            'access_token': asaasKey,
            'User-Agent': 'VetProOrienta/1.0.0',
          };

          // Consulta detalhes do pagamento
          const pRes = await fetch(`${baseUrl}/v3/payments/${targetPaymentId}`, { method: 'GET', headers });
          if (pRes.ok) {
            const pData = await pRes.json();
            if (!invoiceUrl) {
              invoiceUrl = pData.invoiceUrl || pData.paymentLink || pData.bankSlipUrl || `https://www.asaas.com/i/${pData.id}`;
            }
            if (!bankSlipUrl && pData.bankSlipUrl) {
              bankSlipUrl = pData.bankSlipUrl;
            }
            if (!resolvedDueDate && pData.dueDate) {
              resolvedDueDate = pData.dueDate;
            }
            if (pData.value) {
              targetPlanPrice = Number(pData.value);
            }
            if (pData.status === 'OVERDUE') {
              isOverdue = true;
            }
          }

          // Consulta Pix se não tiver
          if (!pixCopiaECola) {
            const pixRes = await fetch(`${baseUrl}/v3/payments/${targetPaymentId}/pixQrCode`, { method: 'GET', headers });
            if (pixRes.ok) {
              const pixData = await pixRes.json();
              if (pixData?.payload) {
                pixCopiaECola = pixData.payload;
              }
            }
          }
        }
      } catch (asaasFetchErr) {
        console.warn('[Send WhatsApp] Erro ao buscar detalhes da fatura no Asaas:', asaasFetchErr);
      }
    }

    // Se invoiceUrl ainda estiver vazia e tivermos targetPaymentId
    if (!invoiceUrl && targetPaymentId) {
      invoiceUrl = `https://www.asaas.com/i/${targetPaymentId}`;
    }

    // 2. Se o telefone não veio, tenta buscar no Supabase
    if (!targetPhone && email && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdminClient() || getSupabaseClient();
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('phone, full_name, plan_name')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();

        if (profile) {
          if (profile.phone) targetPhone = profile.phone.replace(/\D/g, '');
          if (!targetName && profile.full_name) targetName = profile.full_name;
          if (profile.plan_name) targetPlanName = profile.plan_name;
        }
      } catch (dbErr) {
        console.warn('[Send WhatsApp] Erro ao consultar Supabase:', dbErr);
      }
    }

    if (!targetName) targetName = email ? email.split('@')[0] : 'Tutor(a)';
    const firstName = targetName.split(' ')[0];

    // Formata o telefone brasileiro (55 + DDD + Número)
    let formattedPhone = targetPhone;
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = `55${formattedPhone}`;
    }

    const formattedPrice = `R$ ${targetPlanPrice.toFixed(2).replace('.', ',')}`;
    const formattedDueDate = resolvedDueDate
      ? new Date(resolvedDueDate + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'Hoje';

    // 3. Monta o texto elegante da fatura para WhatsApp com número da fatura Asaas
    let messageText = customMessage;
    if (!messageText) {
      const parts: string[] = [];

      if (isOverdue) {
        parts.push(
          `⚠️ *AVISO DE COBRANÇA - FATURA EM ATRASO* ⚠️`,
          `🐶 *VetPro Orienta - Saúde & Orientação Pet* 🐱`,
          ``,
          `Olá, *${firstName}*! Esperamos que você e seus pets estejam bem.`,
          ``,
          `Identificamos que a fatura da sua assinatura do *Plano ${targetPlanName}* encontra-se em atraso:`,
          `• *Fatura Asaas:* \`${targetPaymentId || 'Disponível no link'}\``,
          `• *Valor:* ${formattedPrice}`,
          `• *Vencimento Original:* ${formattedDueDate}`,
          ``,
          `Para regularizar seu acesso à Triagem e manter os cuidados do seu pet sempre ativos, efetue o pagamento abaixo:`
        );
      } else {
        parts.push(
          `🐶 *VetPro Orienta - Fatura da sua Assinatura* 🐱`,
          ``,
          `Olá, *${firstName}*! Tudo bem?`,
          `Sua fatura para o *Plano ${targetPlanName}* (${formattedPrice}/mês) foi gerada no Asaas com sucesso:`,
          `• *Fatura Asaas Nº:* \`${targetPaymentId || 'Disponível no link'}\``,
          `• *Vencimento:* ${formattedDueDate}`
        );
      }

      if (pixCopiaECola) {
        parts.push(
          ``,
          `⚡ *PAGAMENTO INSTANTÂNEO VIA PIX:*`,
          `Copie o código abaixo e cole no app do seu banco (*Pix Copia e Cola*):`,
          ``,
          `\`\`\`${pixCopiaECola}\`\`\``,
          ``,
          `_(A compensação via Pix é imediata e seu acesso será liberado na hora!)_`
        );
      }

      if (invoiceUrl) {
        parts.push(
          ``,
          `💳 *OU PAGUE COM CARTÃO DE CRÉDITO / BOLETO:*`,
          `${invoiceUrl}`
        );
      }

      if (bankSlipUrl) {
        parts.push(
          ``,
          `📄 *Boleto Bancário (PDF):*`,
          `${bankSlipUrl}`
        );
      }

      parts.push(
        ``,
        `✅ *Após o pagamento:* O sistema é atualizado automaticamente e seu acesso continua 100% liberado.`,
        `Qualquer dúvida, estamos à disposição para ajudar você e seu pet! 🐾`
      );

      messageText = parts.join('\n');
    }

    // URL do WhatsApp Web
    const encodedText = encodeURIComponent(messageText);
    const directWhatsappUrl = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    // 4. Disparo via Evolution API
    let evolutionSuccess = false;
    let evolutionError: string | null = null;

    const evoConfig = getEvolutionConfig();
    const serverUrl = (clientServerUrl || evoConfig.serverUrl || process.env.EVOLUTION_SERVER_URL || process.env.NEXT_PUBLIC_EVOLUTION_SERVER_URL || '').replace(/\/+$/, '');
    const apiKey = (clientApiKey || evoConfig.apiKey || process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || '').trim();
    const instanceName = (clientInstanceName || evoConfig.defaultInstance || process.env.EVOLUTION_INSTANCE || 'vetpro-clinica').trim();

    if (serverUrl && apiKey && formattedPhone) {
      try {
        const evoRes = await fetch(`${serverUrl}/message/sendText/${encodeURIComponent(instanceName)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: apiKey,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: messageText,
            textMessage: { text: messageText },
            options: {
              delay: 1200,
              presence: 'composing',
              linkPreview: true,
            },
            delay: 1200,
            linkPreview: true,
          }),
        });

        if (evoRes.ok) {
          evolutionSuccess = true;
        } else {
          let evoJson: any = null;
          try {
            evoJson = await evoRes.json();
          } catch {
            evoJson = { raw: await evoRes.text().catch(() => '') };
          }
          const rawErr = evoJson?.response?.message || evoJson?.message || evoJson?.error || `Status HTTP ${evoRes.status}`;
          evolutionError = Array.isArray(rawErr) ? rawErr.join(' | ') : typeof rawErr === 'object' ? JSON.stringify(rawErr) : String(rawErr);
        }
      } catch (err: any) {
        evolutionError = err.message || 'Erro de conexão ao enviar WhatsApp';
      }
    } else {
      if (!serverUrl || !apiKey) {
        evolutionError = 'Configuração do WhatsApp não localizada. Verifique em Admin > WhatsApp & Evolution.';
      } else if (!formattedPhone) {
        evolutionError = 'Telefone do destinatário não informado.';
      }
    }

    return NextResponse.json({
      success: evolutionSuccess,
      sentViaEvolution: evolutionSuccess,
      evolutionError,
      phone: formattedPhone,
      whatsappUrl: directWhatsappUrl,
      invoiceNumber: targetPaymentId,
      invoiceUrl,
      pixCopiaECola,
      message: messageText,
      statusMessage: evolutionSuccess
        ? 'Mensagem enviada com sucesso para o WhatsApp!'
        : 'Link do WhatsApp gerado para envio.',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/send-whatsapp:', err);
    return NextResponse.json({
      success: false,
      sentViaEvolution: false,
      error: err.message || 'Erro interno ao preparar envio do WhatsApp.',
    }, { status: 500 });
  }
}
