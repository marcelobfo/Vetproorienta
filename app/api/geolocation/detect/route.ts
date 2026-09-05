import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // 1. Extrai IP do cliente através dos cabeçalhos de proxy
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '').replace(/^::ffff:/, '');

    // Se for localhost ou IP privado, busca pelo IP público do servidor / serviço externo
    const isLocal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.');

    let geoData: any = null;

    // 2. Tenta ipwho.is (gratuito, sem chave, alta precisão para Brasil)
    try {
      const url = isLocal ? 'https://ipwho.is/' : `https://ipwho.is/${clientIp}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'VetPro-Orienta/2.0' }, next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          geoData = {
            ip: data.ip,
            city: data.city || 'São Paulo',
            state: data.region_code || data.region || 'SP',
            country: data.country || 'Brasil',
            latitude: data.latitude,
            longitude: data.longitude,
            source: 'ipwhois',
          };
        }
      }
    } catch (e) {
      console.warn('Falha no serviço ipwho.is:', e);
    }

    // 3. Fallback para ip-api.com se ipwho.is falhou
    if (!geoData) {
      try {
        const url = isLocal ? 'http://ip-api.com/json/' : `http://ip-api.com/json/${clientIp}`;
        const res = await fetch(url, { next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            geoData = {
              ip: data.query,
              city: data.city || 'São Paulo',
              state: data.region || 'SP',
              country: data.country || 'Brasil',
              latitude: data.lat,
              longitude: data.lon,
              source: 'ip-api',
            };
          }
        }
      } catch (e) {
        console.warn('Falha no serviço ip-api:', e);
      }
    }

    // 4. Se ambos falharem, retorna dados padrão de contingência para o Brasil (São Paulo - SP)
    if (!geoData) {
      geoData = {
        ip: clientIp || '127.0.0.1',
        city: 'São Paulo',
        state: 'SP',
        country: 'Brasil',
        latitude: -23.55052,
        longitude: -46.633308,
        source: 'default_fallback',
      };
    }

    return NextResponse.json({
      success: true,
      ...geoData,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        city: 'São Paulo',
        state: 'SP',
        latitude: -23.55052,
        longitude: -46.633308,
        error: error.message || 'Erro ao detectar geolocalização por IP.',
      },
      { status: 200 } // Retorna 200 com fallback para nunca quebrar a interface
    );
  }
}
