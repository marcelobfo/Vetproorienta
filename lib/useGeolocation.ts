'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  state?: string;
  country?: string;
  source?: 'gps' | 'ip' | 'manual';
}

function isInsideBrazil(lat: number, lon: number): boolean {
  return lat >= -34.0 && lat <= 6.0 && lon >= -74.0 && lon <= -34.0;
}

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vetpro_user_location');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Se as coordenadas salvas forem fora do Brasil (ex: datacenter dos EUA), descarta
          if (parsed && parsed.latitude && parsed.longitude) {
            if (isInsideBrazil(parsed.latitude, parsed.longitude)) {
              return parsed;
            }
          }
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [ipLoading, setIpLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Reverse geocoding no cliente para obter cidade/estado reais a partir das coordenadas
  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<{ city?: string; state?: string }> => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
        headers: { 'User-Agent': 'VetPro-Orienta/2.0' }
      });
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || '';
        const stateCode = addr.state_code || addr.state || '';
        return {
          city,
          state: stateCode.length === 2 ? stateCode.toUpperCase() : 'MG'
        };
      }
    } catch (e) {
      console.warn('Falha no reverse geocode:', e);
    }
    return {};
  }, []);

  // 1. Detectar localização via IP (Custo Zero)
  const detectLocationByIp = useCallback(async () => {
    setIpLoading(true);
    try {
      // Tenta primeiro via rota de API do app
      const res = await fetch('/api/geolocation/detect');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude && isInsideBrazil(data.latitude, data.longitude)) {
          const ipLoc: UserLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            city: data.city || 'Montes Claros',
            state: data.state || 'MG',
            country: data.country || 'Brasil',
            source: 'ip',
          };
          setLocation((prev) => (prev?.source === 'gps' ? prev : ipLoc));
          try {
            localStorage.setItem('vetpro_user_location', JSON.stringify(ipLoc));
            if (data.city) localStorage.setItem('vetpro_user_city', data.city);
            if (data.state) localStorage.setItem('vetpro_user_state', data.state);
          } catch {}
          return;
        }
      }

      // Fallback: consulta IP direto pelo browser do cliente (pega o IP residencial real)
      try {
        const clientIpRes = await fetch('https://ipwho.is/');
        if (clientIpRes.ok) {
          const clientData = await clientIpRes.json();
          if (clientData.success && clientData.latitude && clientData.longitude) {
            const isBr = clientData.country_code === 'BR' || isInsideBrazil(clientData.latitude, clientData.longitude);
            const ipLoc: UserLocation = {
              latitude: isBr ? clientData.latitude : -16.7282,
              longitude: isBr ? clientData.longitude : -43.8578,
              city: isBr ? (clientData.city || 'Montes Claros') : 'Montes Claros',
              state: isBr ? (clientData.region_code || 'MG') : 'MG',
              country: 'Brasil',
              source: 'ip',
            };
            setLocation((prev) => (prev?.source === 'gps' ? prev : ipLoc));
            localStorage.setItem('vetpro_user_location', JSON.stringify(ipLoc));
            return;
          }
        }
      } catch {}
    } catch (err) {
      console.warn('Erro ao detectar localização por IP:', err);
    } finally {
      setIpLoading(false);
    }
  }, []);

  // 2. Solicitar GPS de alta precisão do navegador/celular
  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador. Usando detecção por cidade.');
      detectLocationByIp();
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        let geoInfo: { city?: string; state?: string } = {};
        if (isInsideBrazil(lat, lon)) {
          geoInfo = await reverseGeocode(lat, lon);
        }

        const userLoc: UserLocation = {
          latitude: lat,
          longitude: lon,
          accuracy: position.coords.accuracy,
          city: geoInfo.city || undefined,
          state: geoInfo.state || undefined,
          source: 'gps',
        };

        setLocation(userLoc);
        setPermissionState('granted');
        setLoading(false);
        try {
          localStorage.setItem('vetpro_user_location', JSON.stringify(userLoc));
          if (geoInfo.city) localStorage.setItem('vetpro_user_city', geoInfo.city);
          if (geoInfo.state) localStorage.setItem('vetpro_user_state', geoInfo.state);
        } catch (e) {
          console.warn('Erro ao salvar localização GPS:', e);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
          setError('Permissão de GPS negada no navegador. Você pode definir sua cidade manualmente no campo de busca.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Sinal de GPS temporariamente indisponível.');
        } else if (err.code === err.TIMEOUT) {
          setError('Tempo esgotado ao buscar GPS.');
        } else {
          setError('Não foi possível obter o GPS.');
        }
        detectLocationByIp();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [detectLocationByIp, reverseGeocode]);

  // Define manualmente a localização e persiste
  const setManualLocation = useCallback((city: string, state: string, lat?: number, lon?: number) => {
    const manualLoc: UserLocation = {
      latitude: lat || -16.7282,
      longitude: lon || -43.8578,
      city: city.trim(),
      state: state.trim().toUpperCase(),
      country: 'Brasil',
      source: 'manual',
    };
    setLocation(manualLoc);
    try {
      localStorage.setItem('vetpro_user_location', JSON.stringify(manualLoc));
      localStorage.setItem('vetpro_user_city', city.trim());
      localStorage.setItem('vetpro_user_state', state.trim().toUpperCase());
    } catch {}
  }, []);

  // Ao iniciar, detecta por IP automaticamente se não tiver nada salvo
  useEffect(() => {
    let isMounted = true;
    const fetchIpLocation = async () => {
      if (!location && isMounted) {
        await detectLocationByIp();
      }
    };
    fetchIpLocation();
    return () => {
      isMounted = false;
    };
  }, [location, detectLocationByIp]);

  return {
    location,
    loading: loading || ipLoading,
    gpsLoading: loading,
    ipLoading,
    error,
    permissionState,
    requestLocation,
    detectLocationByIp,
    setLocation,
    setManualLocation,
  };
}
