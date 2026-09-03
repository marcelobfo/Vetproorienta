import { NextRequest, NextResponse } from 'next/server';
import { getAsaasBaseUrl } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer, apiKey: clientApiKey, environment, customBaseUrl } = body;

    const apiKey = (
      clientApiKey || 
      process.env.ASAAS_API_KEY || 
      process.env.NEXT_PUBLIC_ASAAS_API_KEY || 
      process.env.ASAAS_ACCESS_TOKEN || 
      process.env.ASAAS_KEY || 
      process.env.ASAAS_TOKEN || 
      ''
    ).trim();
    const baseUrl = getAsaasBaseUrl(apiKey, environment, customBaseUrl);

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chave de API do Asaas (ASAAS_API_KEY) não configurada. Defina no arquivo .env ou no painel de configurações.',
        },
        { status: 400 }
      );
    }

    if (!customer || !customer.name || !customer.cpfCnpj) {
      return NextResponse.json(
        {
          success: false,
          error: 'Nome e CPF/CNPJ são campos obrigatórios para o cadastro de cliente no Asaas.',
        },
        { status: 400 }
      );
    }

    // Sanitiza CPF/CNPJ (apenas dígitos)
    const sanitizedCpfCnpj = customer.cpfCnpj.toString().replace(/\D/g, '');
    if (sanitizedCpfCnpj.length !== 11 && sanitizedCpfCnpj.length !== 14) {
      return NextResponse.json(
        {
          success: false,
          error: 'CPF ou CNPJ informado é inválido. Deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).',
        },
        { status: 400 }
      );
    }

    // Sanitiza telefones
    const mobilePhone = customer.mobilePhone 
      ? customer.mobilePhone.toString().replace(/\D/g, '') 
      : customer.phone 
        ? customer.phone.toString().replace(/\D/g, '') 
        : undefined;

    const headers = {
      'Content-Type': 'application/json',
      'access_token': apiKey,
      'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
    };

    // 1. Estratégia de Prevenção de Duplicidade (Recomendada pela documentação Asaas)
    try {
      const searchUrl = `${baseUrl}/v3/customers?cpfCnpj=${encodeURIComponent(sanitizedCpfCnpj)}`;
      const searchRes = await fetch(searchUrl, {
        method: 'GET',
        headers,
      });

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
          const existingCustomer = searchJson.data[0];
          return NextResponse.json({
            success: true,
            customer: existingCustomer,
            isExisting: true,
            message: `Cliente '${existingCustomer.name}' já cadastrado no Asaas. Identificador recuperado.`,
          });
        }
      }
    } catch (searchErr) {
      console.warn('Aviso: Não foi possível realizar busca prévia no Asaas, prosseguindo com criação:', searchErr);
    }

    // 2. Monta o payload conforme a OpenAPI do Asaas (/v3/customers)
    const customerPayload: Record<string, any> = {
      name: customer.name.trim(),
      cpfCnpj: sanitizedCpfCnpj,
    };

    if (customer.email && customer.email.trim()) {
      customerPayload.email = customer.email.trim();
    }
    if (mobilePhone && mobilePhone.length >= 10) {
      customerPayload.mobilePhone = mobilePhone;
    }
    if (customer.phone && customer.phone.toString().replace(/\D/g, '').length >= 10) {
      customerPayload.phone = customer.phone.toString().replace(/\D/g, '');
    }
    if (customer.address) customerPayload.address = customer.address;
    if (customer.addressNumber) customerPayload.addressNumber = customer.addressNumber;
    if (customer.complement) customerPayload.complement = customer.complement;
    if (customer.province) customerPayload.province = customer.province;
    if (customer.postalCode) {
      customerPayload.postalCode = customer.postalCode.toString().replace(/\D/g, '');
    }
    if (customer.externalReference) {
      customerPayload.externalReference = customer.externalReference;
    }
    if (customer.notificationDisabled !== undefined) {
      customerPayload.notificationDisabled = Boolean(customer.notificationDisabled);
    }
    if (customer.additionalEmails) {
      customerPayload.additionalEmails = customer.additionalEmails;
    }

    // 3. Chamada de criação no Asaas: POST /v3/customers
    const targetUrl = `${baseUrl}/v3/customers`;
    const asaasRes = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(customerPayload),
    });

    const resJson = await asaasRes.json();

    if (!asaasRes.ok) {
      let errorMessage = 'Erro ao cadastrar cliente no Asaas.';
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

    return NextResponse.json({
      success: true,
      customer: resJson,
      isExisting: false,
      message: 'Cliente criado com sucesso no Asaas!',
    });
  } catch (err: any) {
    console.error('Erro na rota /api/asaas/customers:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Erro interno no servidor ao se comunicar com Asaas.',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cpfCnpj = searchParams.get('cpfCnpj');
    const email = searchParams.get('email');
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
    if (cpfCnpj) query.set('cpfCnpj', cpfCnpj.replace(/\D/g, ''));
    if (email) query.set('email', email);

    const targetUrl = `${baseUrl}/v3/customers?${query.toString()}`;
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
