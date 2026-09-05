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

export function useGeolocation() {
  const [location, setLocation] = useState<UserLocation | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vetpro_user_location');
      if (saved) {
        try {
          return JSON.parse(saved);
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

  // 1. Detectar localização via IP (Custo Zero e instantâneo)
  const detectLocationByIp = useCallback(async () => {
    setIpLoading(true);
    try {
      const res = await fetch('/api/geolocation/detect');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setLocation((prev) => {
            // Se já temos um GPS preciso gravado pelo usuário, mantém o GPS
            if (prev && prev.source === 'gps') return prev;

            const ipLoc: UserLocation = {
              latitude: data.latitude,
              longitude: data.longitude,
              city: data.city || 'São Paulo',
              state: data.state || 'SP',
              country: data.country || 'Brasil',
              source: 'ip',
            };
            try {
              localStorage.setItem('vetpro_user_location', JSON.stringify(ipLoc));
              if (data.city) localStorage.setItem('vetpro_user_city', data.city);
              if (data.state) localStorage.setItem('vetpro_user_state', data.state);
            } catch (e) {
              console.warn('Erro ao salvar local de IP:', e);
            }
            return ipLoc;
          });
        }
      }
    } catch (err) {
      console.warn('Erro ao detectar localização por IP:', err);
    } finally {
      setIpLoading(false);
    }
  }, []);

  // 2. Solicitar GPS de alta precisão do navegador
  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocalização por GPS não é suportada pelo seu navegador. Usando detecção por IP.');
      detectLocationByIp();
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLoc: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          source: 'gps',
        };
        setLocation(userLoc);
        setPermissionState('granted');
        setLoading(false);
        try {
          localStorage.setItem('vetpro_user_location', JSON.stringify(userLoc));
        } catch (e) {
          console.warn('Erro ao salvar localização GPS no cache:', e);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
          setError('Permissão de GPS não concedida. Usando localização por IP da sua conexão.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Sinal de GPS indisponível no momento. Usando localização por IP.');
        } else if (err.code === err.TIMEOUT) {
          setError('Tempo esgotado ao buscar GPS. Usando localização por IP.');
        } else {
          setError('Não foi possível obter o GPS. Usando localização por IP.');
        }
        // Em caso de falha de GPS, faz o fallback imediato para IP
        detectLocationByIp();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [detectLocationByIp]);

  // Ao iniciar, se não tiver localização salva, detecta por IP automaticamente
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

  // Verificar status de permissão se a API permissions existir
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
            if (permissionStatus.state === 'granted') {
              requestLocation();
            }
          };
        })
        .catch(() => {});
    }
  }, [requestLocation]);

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
  };
}
