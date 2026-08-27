import { NextRequest, NextResponse } from 'next/server';

// Rota para receber Webhooks do Asaas (ex: pagamento confirmado, assinatura renovada)
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('asaas-signature');
    // Validação de assinatura em produção deve acontecer aqui
    
    const event = await req.json();

    // Log de auditoria (simulado)
    console.log(`[AUDIT LOG] Asaas Webhook recebido: ${event.event} para cobrança ${event.payment?.id}`);

    if (event.event === 'PAYMENT_RECEIVED') {
      // Atualizar status no Supabase
      // const customerId = event.payment.customer;
      // await supabase.from('tenants').update({ subscription_status: 'active' }).eq('asaas_customer_id', customerId);
    } else if (event.event === 'PAYMENT_OVERDUE') {
      // Bloquear acesso
      // await supabase.from('tenants').update({ subscription_status: 'overdue' }).eq('asaas_customer_id', customerId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro no webhook Asaas:", error);
    return NextResponse.json({ error: "Erro ao processar webhook" }, { status: 500 });
  }
}
