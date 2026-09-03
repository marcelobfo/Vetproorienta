import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { getAsaasApiKey } from '@/lib/asaas';
import { sendAccessLiberatedWhatsApp } from '@/lib/whatsappNotification';

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
      const customerName = tutorProfile?.full_name || tutorProfile?.name || payment?.customerName || 'Tutor';
      const customerCpf = tutorProfile?.cpf || tutorProfile?.cpf_cnpj || payment?.customerCpfCnpj || '';
      const planName = tutorProfile?.plan_name || tutorProfile?.plan_selected || 'Essencial';

      if (customerPhone && customerEmail) {
        const waResult = await sendAccessLiberatedWhatsApp({
          phone: customerPhone,
          name: customerName,
          email: customerEmail,
          cpf: customerCpf,
          planName,
        });
        console.log(`[AUDIT LOG] Mensagem de liberação enviada para o WhatsApp: ${customerPhone} (Resultado: ${waResult.success})`);
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
