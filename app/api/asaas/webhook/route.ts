import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { sendAccessLiberatedWhatsApp } from '@/lib/whatsappNotification';

// Eventos de webhook suportados pelo Asaas
// PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_DELETED, PAYMENT_REFUNDED
// SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_INACTIVATED, SUBSCRIPTION_DELETED

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const event = body.event;
    const payment = body.payment;
    const subscription = body.subscription;

    console.log(`[ASAAS WEBHOOK] Evento recebido: ${event}`, {
      paymentId: payment?.id,
      subscriptionId: payment?.subscription || subscription?.id,
      customer: payment?.customer || subscription?.customer,
      value: payment?.value || subscription?.value,
      status: payment?.status || subscription?.status,
    });

    // 1. Validação opcional por Header de AuthToken
    const receivedToken = req.headers.get('asaas-access-token') || req.headers.get('x-asaas-access-token');
    const configuredToken = process.env.ASAAS_WEBHOOK_AUTH_TOKEN?.trim();

    // Se houver um token real configurado no servidor (ignora placeholders de exemplo)
    const isRealTokenConfigured = Boolean(
      configuredToken && 
      !configuredToken.startsWith('sua_') && 
      !configuredToken.startsWith('SEU_') &&
      !configuredToken.includes('exemplo') &&
      configuredToken.length >= 6
    );

    if (isRealTokenConfigured) {
      if (!receivedToken || receivedToken !== configuredToken) {
        console.warn('[ASAAS WEBHOOK] Token de autenticação incorreto ou ausente no header asaas-access-token:', {
          received: receivedToken ? 'presente (incompatível)' : 'ausente',
        });
        return NextResponse.json({ error: 'Unauthorized webhook token' }, { status: 401 });
      }
    }

    // 2. Determina o status de liberação da plataforma
    const customerId = payment?.customer || subscription?.customer;
    const subscriptionId = payment?.subscription || subscription?.id;
    let planStatus = 'INACTIVE';

    if (
      event === 'PAYMENT_RECEIVED' || 
      event === 'PAYMENT_CONFIRMED' || 
      event === 'SUBSCRIPTION_CREATED' || 
      event === 'SUBSCRIPTION_UPDATED' ||
      payment?.status === 'RECEIVED' ||
      payment?.status === 'CONFIRMED' ||
      subscription?.status === 'ACTIVE'
    ) {
      planStatus = 'ACTIVE';
    } else if (
      event === 'PAYMENT_OVERDUE' || 
      event === 'SUBSCRIPTION_INACTIVATED' || 
      event === 'SUBSCRIPTION_DELETED' ||
      event === 'PAYMENT_REFUNDED'
    ) {
      planStatus = 'INACTIVE';
    }

    // 3. Atualiza no Supabase e dispara mensagem de WhatsApp (se configurado)
    let userProfile: any = null;
    if (isSupabaseConfigured() && customerId) {
      try {
        const supabase = getSupabaseClient();
        
        // Busca perfil do usuário
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('asaas_customer_id', customerId)
          .limit(1);

        if (profiles && profiles.length > 0) {
          userProfile = profiles[0];
        }

        // Atualiza perfil do usuário que possui o asaas_customer_id
        await supabase
          .from('user_profiles')
          .update({
            subscription_status: planStatus,
            asaas_subscription_id: subscriptionId || null,
            last_payment_date: planStatus === 'ACTIVE' ? new Date().toISOString() : undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('asaas_customer_id', customerId);

        // Registra evento no log financeiro
        await supabase
          .from('webhook_logs')
          .insert([{
            event_type: event,
            source: 'asaas',
            payload: body,
            created_at: new Date().toISOString(),
          }]);
      } catch (dbErr) {
        console.warn('[ASAAS WEBHOOK] Falha ao persistir evento no Supabase:', dbErr);
      }
    }

    // 4. Se o pagamento foi aprovado, dispara mensagem de boas-vindas com login e senha liberados
    if (planStatus === 'ACTIVE') {
      const targetPhone = userProfile?.phone || payment?.customerPhone || payment?.mobilePhone;
      const targetEmail = userProfile?.email || payment?.customerEmail;
      const targetName = userProfile?.full_name || userProfile?.name || payment?.customerName || 'Tutor';
      const targetCpf = userProfile?.cpf || userProfile?.cpf_cnpj || payment?.customerCpfCnpj || '';
      const planName = userProfile?.plan_name || userProfile?.plan_selected || 'Essencial';

      if (targetPhone && targetEmail) {
        try {
          await sendAccessLiberatedWhatsApp({
            phone: targetPhone,
            name: targetName,
            email: targetEmail,
            cpf: targetCpf,
            planName,
          });
          console.log(`[ASAAS WEBHOOK] Acesso liberado enviado via WhatsApp para ${targetPhone}`);
        } catch (waErr) {
          console.warn('[ASAAS WEBHOOK] Falha ao enviar WhatsApp de liberação:', waErr);
        }
      }
    }

    return NextResponse.json({
      received: true,
      event,
      planStatus,
      customerId,
      subscriptionId,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[ASAAS WEBHOOK ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    endpoint: '/api/asaas/webhook',
    description: 'Endpoint de Webhook do Asaas para recebimento e atualização de status de pagamentos e assinaturas.',
  });
}
