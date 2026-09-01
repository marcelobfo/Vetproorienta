import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VetPro Orienta - Orientação Veterinária com IA',
    short_name: 'VetPro',
    description: 'Plataforma multi-tenant de orientação veterinária com IA, geolocalização de parceiros e carteirinha pet',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0f12',
    theme_color: '#0d9488',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
