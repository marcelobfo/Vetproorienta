import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getAsaasApiKey } from '@/lib/asaas';

/**
 * Envia mensagem pelo Evolution API instalado (servidor / WhatsApp)
 */
async function sendWhatsAppMessage(toPhone: string, text: string) {
  let phone = toPhone.replace(/\D/g, '');
  if (!phone || phone.length < 10) return { success: false, error: 'Telefone inválido' };

  if (phone.length === 10 || phone.length === 11) {
    phone = `55${phone}`;
  }

  const serverUrl = (process.env.EVOLUTION_SERVER_URL || '').replace(/\/+$/, '');
  const apiKey = process.env.EVOLUTION_API_KEY || '';
  const instanceName = process.env.EVOLUTION_DEFAULT_INSTANCE || 'vetpro-clinica';

  if (!serverUrl) {
    console.warn('[Webhook Asaas WhatsApp] Servidor Evolution API não configurado.');
    return { success: false, error: 'Servidor Evolution não configurado' };
  }

  try {
    const targetUrl = `${serverUrl}/message/sendText/${encodeURIComponent(instanceName)}`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: phone,
        text,
        delay: 1200,
        linkPreview: true,
      }),
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = { raw: await res.text() };
    }
    return { success: res.ok, data };
  } catch (err: any) {
    console.error('[Webhook Asaas WhatsApp] Erro ao enviar mensagem WhatsApp:', err);
    return { success: false, error: err.message || 'Erro ao enviar mensagem WhatsApp' };
  }
}

/**
 * Rota para receber Webhooks do Asaas (ex: pagamento confirmado, assinatura renovada, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    const authToken = req.headers.get('asaas-access-token');
    const configuredToken = process.env.ASAAS_WEBHOOK_AUTH_TOKEN;

    // Se houver token configurado e não bater, loga aviso
    if (configuredToken && authToken && authToken !== configuredToken) {
      console.warn('[AUDIT LOG] Asaas Webhook: Token de autenticação incorreto');
    }

    const payload = await req.json();
    const eventType = payload.event;
    const payment = payload.payment;
    const customerId = payment?.customer || payload.customer;
    const subscriptionId = payment?.subscription || payload.subscription;

    console.log(`[AUDIT LOG] Asaas Webhook recebido: ${eventType} | Cliente: ${customerId} | Cobrança: ${payment?.id}`);

    // Eventos de confirmação de pagamento
    const isPaymentSuccess = 
      eventType === 'PAYMENT_RECEIVED' || 
      eventType === 'PAYMENT_CONFIRMED' || 
      eventType === 'PAYMENT_UPDATED' && payment?.status === 'RECEIVED';

    const isPaymentOverdue = 
      eventType === 'PAYMENT_OVERDUE' || 
      eventType === 'PAYMENT_DELETED';

    if (isPaymentSuccess) {
      let tutorProfile: any = null;

      // 1. Atualizar no Supabase
      if (isSupabaseConfigured() && (customerId || subscriptionId)) {
        try {
          const supabase = getSupabaseClient();
          
          // Busca perfil pelo customer_id ou subscription_id
          let query = supabase.from('user_profiles').select('*');
          if (customerId) {
            query = query.eq('asaas_customer_id', customerId);
          } else if (subscriptionId) {
            query = query.eq('subscription_id', subscriptionId);
          }

          const { data: profiles } = await query.limit(1);
          if (profiles && profiles.length > 0) {
            tutorProfile = profiles[0];

            // Atualiza status para ativo e libera acesso
            await supabase
              .from('user_profiles')
              .update({
                status: 'active',
                subscription_status: 'ACTIVE',
                last_payment_date: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', tutorProfile.id);

            console.log(`[AUDIT LOG] Usuário ${tutorProfile.email} ativado com sucesso!`);
          }
        } catch (dbErr: any) {
          console.error('[AUDIT LOG] Erro ao atualizar perfil no Supabase:', dbErr.message);
        }
      }

      // 2. Se temos os dados do tutor (seja pelo banco ou pelos metadados do webhook), envia o WhatsApp de liberação com usuário e senha
      const customerPhone = tutorProfile?.phone || payment?.customerPhone || payment?.mobilePhone;
      const customerEmail = tutorProfile?.email || payment?.customerEmail;
      const customerName = tutorProfile?.full_name || payment?.customerName || 'Tutor';
      const customerCpf = tutorProfile?.cpf || payment?.customerCpfCnpj || '';

      if (customerPhone) {
        const firstName = customerName.split(' ')[0];
        const initialPassword = customerCpf || 'Seu CPF (apenas números)';

        const activeMessage = 
          `🎉 *Parabéns, ${firstName}! Seu pagamento foi confirmado com sucesso!*\n\n` +
          `Sua assinatura do *VetPro Orienta* está oficialmente *ATIVA* e seus módulos de triagem com IA estão 100% liberados! 🚀🐾\n\n` +
          `🔐 *SEUS DADOS OFICIAIS DE ACESSO:*\n` +
          `• *Painel:* https://vetpro-orienta.app/login\n` +
          `• *Usuário (E-mail):* ${customerEmail || 'Seu e-mail cadastrado'}\n` +
          `• *Senha de Acesso:* ${initialPassword}\n\n` +
          `💡 *Próximos Passos:*\n` +
          `1. Acesse o link acima e faça seu login.\n` +
          `2. Cadastre a ficha dos seus pets (cão/gato, raça, idade e histórico).\n` +
          `3. Inicie triagens clínicas com IA sempre que precisar de orientação rápida!\n\n` +
          `Muito obrigado pela confiança! Conte sempre conosco para cuidar da saúde do seu pet! ❤️`;

        await sendWhatsAppMessage(customerPhone, activeMessage);
        console.log(`[AUDIT LOG] Mensagem de liberação enviada para o WhatsApp: ${customerPhone}`);
      }
    } else if (isPaymentOverdue) {
      // Caso de inadimplência: bloquear acesso no Supabase
      if (isSupabaseConfigured() && customerId) {
        try {
          const supabase = getSupabaseClient();
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'OVERDUE',
              status: 'inactive',
              updated_at: new Date().toISOString(),
            })
            .eq('asaas_customer_id', customerId);

          console.log(`[AUDIT LOG] Assinatura do cliente ${customerId} suspensa por falta de pagamento.`);
        } catch (dbErr: any) {
          console.error('[AUDIT LOG] Erro ao suspender perfil:', dbErr.message);
        }
      }
    }

    return NextResponse.json({
      received: true,
      event: eventType,
      processed: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[AUDIT LOG] Erro no webhook Asaas:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook', details: error.message },
      { status: 500 }
    );
  }
}
