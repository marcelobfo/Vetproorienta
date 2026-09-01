'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  addressName?: string;
  city?: string;
  state?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
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
        };
        setLocation(userLoc);
        setPermissionState('granted');
        setLoading(false);
        try {
          localStorage.setItem('vetpro_user_location', JSON.stringify(userLoc));
        } catch (e) {
          console.warn('Erro ao salvar localização no cache:', e);
        }
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState('denied');
          setError('Permissão de localização negada. Você pode buscar por cidade ou bairro.');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('Sinal de GPS indisponível no momento.');
        } else if (err.code === err.TIMEOUT) {
          setError('Tempo esgotado ao buscar localização.');
        } else {
          setError('Não foi possível obter sua localização.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  // Verificar status de permissão se a API permissions existir
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((permissionStatus) => {
          setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state as 'prompt' | 'granted' | 'denied');
          };
        })
        .catch(() => {});
    }
  }, []);

  return {
    location,
    loading,
    error,
    permissionState,
    requestLocation,
    setLocation,
  };
}
