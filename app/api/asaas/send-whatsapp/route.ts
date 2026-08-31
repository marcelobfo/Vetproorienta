import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseAdminClient, isSupabaseConfigured } from '@/lib/supabase';
import { getEvolutionConfig } from '@/lib/evolution';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      phone,
      name,
      email,
      planName,
      planPrice,
      pixCopiaECola,
      paymentUrl,
      bankSlipUrl,
      dueDate,
      customMessage,
      serverUrl: clientServerUrl,
      apiKey: clientApiKey,
      instanceName: clientInstanceName,
    } = body;

    let targetPhone = (phone || '').toString().replace(/\D/g, '');
    let targetName = (name || '').trim();
    let targetPlanName = planName || 'Essencial';
    let targetPlanPrice = Number(planPrice) || 9.90;

    // Se o telefone não veio, tenta buscar no Supabase se houver email
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

    // Formata o número para padrão E.164 brasileiro (55 + DDD + Número)
    let formattedPhone = targetPhone;
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
      formattedPhone = `55${formattedPhone}`;
    }

    // Monta texto formatado e elegante da fatura para WhatsApp
    let messageText = customMessage;
    if (!messageText) {
      const parts: string[] = [
        `🐶 *VetPro Orienta - Fatura da sua Assinatura* 🐱`,
        ``,
        `Olá, *${firstName}*! Tudo bem?`,
        `Sua fatura para o *Plano ${targetPlanName}* (R$ ${targetPlanPrice.toFixed(2).replace('.', ',')}/mês) foi gerada no Asaas com sucesso.`,
      ];

      if (pixCopiaECola) {
        parts.push(
          ``,
          `⚡ *PAGAMENTO INSTANTÂNEO VIA PIX:*`,
          `Copie o código abaixo e cole no app do seu banco (*Pix Copia e Cola*):`,
          ``,
          `\`\`\`${pixCopiaECola}\`\`\``,
          ``,
          `_(A compensação do Pix é imediata e seu acesso será liberado na hora!)_`
        );
      }

      if (paymentUrl) {
        parts.push(
          ``,
          `💳 *OU PAGUE COM CARTÃO DE CRÉDITO / BOLETO:*`,
          `${paymentUrl}`
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
        `✅ *Após pagar:* Seu acesso completo à Triagem com IA e Gestão dos seus Pets é liberado instantaneamente.`,
        `Dúvidas? Estamos à disposição!`
      );

      messageText = parts.join('\n');
    }

    // Constrói URL direta do WhatsApp (wa.me) para fallback imediato
    const encodedText = encodeURIComponent(messageText);
    const directWhatsappUrl = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    // Tenta envio automatizado via Evolution API se configurado
    let evolutionSuccess = false;
    let evolutionError: string | null = null;

    const evoConfig = getEvolutionConfig();
    const serverUrl = (clientServerUrl || evoConfig.serverUrl || process.env.EVOLUTION_SERVER_URL || '').replace(/\/+$/, '');
    const apiKey = clientApiKey || evoConfig.apiKey || process.env.EVOLUTION_API_KEY || '';
    const instanceName = clientInstanceName || evoConfig.defaultInstance || 'vetpro-clinica';

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
          }),
        });

        if (evoRes.ok) {
          evolutionSuccess = true;
        } else {
          const evoJson = await evoRes.json().catch(() => ({}));
          evolutionError = evoJson?.message || evoJson?.error || `Status HTTP ${evoRes.status}`;
        }
      } catch (err: any) {
        evolutionError = err.message || 'Erro ao conectar à Evolution API';
      }
    }

    return NextResponse.json({
      success: true,
      sentViaEvolution: evolutionSuccess,
      evolutionError,
      phone: formattedPhone,
      whatsappUrl: directWhatsappUrl,
      message: messageText,
      statusMessage: evolutionSuccess 
        ? 'Mensagem enviada com sucesso para o WhatsApp cadastrado!' 
        : 'Link do WhatsApp gerado para envio.',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/send-whatsapp:', err);
    return NextResponse.json({
      success: false,
      error: err.message || 'Erro interno ao processar envio para o WhatsApp.',
    }, { status: 500 });
  }
}
