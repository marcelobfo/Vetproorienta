import { NextRequest, NextResponse } from 'next/server';
import { getAsaasBaseUrl } from '@/lib/asaas';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey: clientApiKey, environment, customBaseUrl } = body;

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
          message: 'Token de API do Asaas não informado. Configure ASAAS_API_KEY no arquivo .env ou no painel.',
        },
        { status: 400 }
      );
    }

    // Consulta de teste básica para verificar se a chave e endpoint estão funcionais
    const testUrl = `${baseUrl}/v3/customers?limit=1`;
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'access_token': apiKey,
        'User-Agent': 'VetProOrienta/1.0.0 (https://vetpro-orienta.app)',
      },
    });

    const resJson = await response.json();

    if (!response.ok) {
      let errorMsg = 'Falha na autenticação com o Asaas.';
      if (Array.isArray(resJson?.errors) && resJson.errors.length > 0) {
        errorMsg = resJson.errors.map((e: any) => e.description || e.code).join(' | ');
      } else if (resJson?.message) {
        errorMsg = resJson.message;
      }

      return NextResponse.json(
        {
          success: false,
          message: `Erro na API do Asaas: ${errorMsg}`,
          status: response.status,
          details: resJson,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conexão com a API do Asaas estabelecida com sucesso!',
      environment: baseUrl.includes('sandbox') ? 'Sandbox (Testes)' : 'Produção',
      baseUrl,
      totalCustomers: resJson.totalCount ?? resJson.data?.length ?? 0,
      details: resJson,
    });
  } catch (err: any) {
    console.error('Erro ao testar Asaas:', err);
    return NextResponse.json(
      {
        success: false,
        message: `Falha na conexão com o Asaas: ${err.message || 'Erro de rede'}`,
      },
      { status: 500 }
    );
  }
}
