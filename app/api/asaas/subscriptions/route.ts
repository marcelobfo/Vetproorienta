import { NextRequest, NextResponse } from 'next/server';
import { getAsaasBaseUrl } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { subscription, apiKey: clientApiKey, environment, customBaseUrl } = body;

    const apiKey = (process.env.ASAAS_API_KEY || clientApiKey || '').trim();
    const baseUrl = getAsaasBaseUrl(apiKey, environment, customBaseUrl);

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chave de API do Asaas (ASAAS_API_KEY) não configurada.',
        },
        { status: 400 }
      );
    }

    if (!subscription || !subscription.customer || !subscription.value || !subscription.nextDueDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Campos obrigatórios ausentes: customer, value e nextDueDate.',
        },
        { status: 400 }
      );
    }

    const payload: Record<string, any> = {
      customer: subscription.customer,
      billingType: subscription.billingType || 'UNDEFINED',
      value: Number(subscription.value),
      nextDueDate: subscription.nextDueDate,
      cycle: subscription.cycle || 'MONTHLY',
      description: subscription.description || 'Assinatura Plano VetPro Orienta',
    };

    if (subscription.externalReference) {
      payload.externalReference = subscription.externalReference;
    }
    if (subscription.endDate) {
      payload.endDate = subscription.endDate;
    }
    if (subscription.maxPayments) {
      payload.maxPayments = Number(subscription.maxPayments);
    }
    if (subscription.callback) {
      payload.callback = subscription.callback;
    }

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    // Chamada oficial: POST /v3/subscriptions
    const targetUrl = `${baseUrl}/v3/subscriptions`;
    const asaasRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const resJson = await asaasRes.json();

    if (!asaasRes.ok) {
      let errorMessage = 'Erro ao criar assinatura no Asaas.';
      if (Array.isArray(resJson?.errors) && resJson.errors.length > 0) {
        errorMessage = resJson.errors.map((e: any) => e.description || e.code).join(' | ');
      } else if (resJson?.message) {
        errorMessage = resJson.message;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: asaasRes.status,
          details: resJson,
        },
        { status: asaasRes.status >= 400 && asaasRes.status < 500 ? 400 : 502 }
      );
    }

    // Tenta buscar link de pagamento / checkout gerado para a primeira fatura da assinatura e seu QR Code PIX
    let paymentUrl = resJson.paymentLink || '';
    let pixQrCodeImage = '';
    let pixCopiaECola = '';
    let paymentId = '';
    let paymentDueDate = '';
    let paymentValue = resJson.value;

    if (resJson.id) {
      try {
        const paymentsRes = await fetch(`${baseUrl}/v3/subscriptions/${resJson.id}/payments`, {
          method: 'GET',
          headers,
        });
        if (paymentsRes.ok) {
          const paymentsJson = await paymentsRes.json();
          const firstPayment = paymentsJson?.data?.[0];
          if (firstPayment) {
            paymentId = firstPayment.id;
            paymentDueDate = firstPayment.dueDate;
            paymentValue = firstPayment.value;
            if (!paymentUrl && (firstPayment.invoiceUrl || firstPayment.bankSlipUrl)) {
              paymentUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl;
            }

            // Tenta obter o QR Code PIX da primeira fatura
            if (paymentId) {
              try {
                const pixRes = await fetch(`${baseUrl}/v3/payments/${paymentId}/pixQrCode`, {
                  method: 'GET',
                  headers,
                });
                if (pixRes.ok) {
                  const pixJson = await pixRes.json();
                  if (pixJson?.encodedImage) {
                    pixQrCodeImage = pixJson.encodedImage.startsWith('data:')
                      ? pixJson.encodedImage
                      : `data:image/png;base64,${pixJson.encodedImage}`;
                  }
                  if (pixJson?.payload) {
                    pixCopiaECola = pixJson.payload;
                  }
                }
              } catch (pixErr) {
                console.warn('Não foi possível obter pixQrCode inicial:', pixErr);
              }
            }
          }
        }
      } catch (pErr) {
        console.warn('Não foi possível buscar faturas e pix iniciais:', pErr);
      }
    }

    return NextResponse.json({
      success: true,
      subscription: resJson,
      paymentUrl,
      paymentId,
      pixQrCodeImage,
      pixCopiaECola,
      dueDate: paymentDueDate,
      value: paymentValue,
      message: 'Assinatura criada com sucesso no Asaas!',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/subscriptions:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro interno no servidor ao criar assinatura.',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customer = searchParams.get('customer');
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const apiKey = (process.env.ASAAS_API_KEY || req.headers.get('x-asaas-key') || '').trim();
    const envHeader = (req.headers.get('x-asaas-environment') || undefined) as any;
    const customUrlHeader = req.headers.get('x-asaas-custom-url') || undefined;
    const baseUrl = getAsaasBaseUrl(apiKey, envHeader, customUrlHeader);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'Chave ASAAS_API_KEY não configurada.' },
        { status: 400 }
      );
    }

    const query = new URLSearchParams();
    query.set('limit', limit);
    query.set('offset', offset);
    if (customer) query.set('customer', customer);

    const targetUrl = `${baseUrl}/v3/subscriptions?${query.toString()}`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'User-Agent': 'VetProOrienta/1.0.0',
      },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ success: false, details: data }, { status: response.status });
    }

    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
