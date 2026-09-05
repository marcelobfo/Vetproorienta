import { NextRequest, NextResponse } from 'next/server';

function isInsideBrazil(lat: number, lon: number): boolean {
  return lat >= -34.0 && lat <= 6.0 && lon >= -74.0 && lon <= -34.0;
}

export async function GET(req: NextRequest) {
  try {
    // 1. Extrai possíveis IPs do cliente
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    const clientIp = (cfIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '')).replace(/^::ffff:/, '');

    const isLocalOrPrivate = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.startsWith('192.168.') || clientIp.startsWith('10.') || clientIp.startsWith('172.16.');

    let geoData: any = null;

    // 2. Se temos IP público do cliente, busca via ipwho.is
    if (!isLocalOrPrivate) {
      try {
        const res = await fetch(`https://ipwho.is/${clientIp}`, {
          headers: { 'User-Agent': 'VetPro-Orienta/2.0' },
          next: { revalidate: 3600 }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.latitude && data.longitude) {
            // Apenas aceita se estiver no Brasil
            if (data.country_code === 'BR' || isInsideBrazil(data.latitude, data.longitude)) {
              geoData = {
                ip: data.ip,
                city: data.city || 'Montes Claros',
                state: data.region_code || 'MG',
                country: 'Brasil',
                latitude: data.latitude,
                longitude: data.longitude,
                source: 'ipwhois',
              };
            }
          }
        }
      } catch (e) {
        console.warn('Falha no ipwho.is:', e);
      }
    }

    // 3. Fallback via ip-api.com
    if (!geoData && !isLocalOrPrivate) {
      try {
        const res = await fetch(`http://ip-api.com/json/${clientIp}`, { next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.lat && data.lon) {
            if (data.countryCode === 'BR' || isInsideBrazil(data.lat, data.lon)) {
              geoData = {
                ip: data.query,
                city: data.city || 'Montes Claros',
                state: data.region || 'MG',
                country: 'Brasil',
                latitude: data.lat,
                longitude: data.lon,
                source: 'ip-api',
              };
            }
          }
        }
      } catch (e) {
        console.warn('Falha no ip-api:', e);
      }
    }

    // 4. Se não conseguiu detectar IP brasileiro (ex: ambiente de teste ou proxy em nuvem externa),
    // retorna dados brasileiros seguros de referência
    if (!geoData) {
      geoData = {
        ip: clientIp || '127.0.0.1',
        city: 'Montes Claros',
        state: 'MG',
        country: 'Brasil',
        latitude: -16.7282,
        longitude: -43.8578,
        source: 'brazil_default',
      };
    }

    return NextResponse.json({
      success: true,
      ...geoData,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      city: 'Montes Claros',
      state: 'MG',
      country: 'Brasil',
      latitude: -16.7282,
      longitude: -43.8578,
      source: 'brazil_fallback',
    });
  }
}
