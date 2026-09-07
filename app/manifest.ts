import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'VetPro Orienta - Assistente Veterinário',
    short_name: 'VetPro',
    description: 'Plataforma inteligente de orientação veterinária com IA, triagem técnica, rede de parceiros credenciados e carteirinha digital de pets.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    orientation: 'portrait-primary',
    background_color: '#0A1826',
    theme_color: '#2FD9A6',
    categories: ['medical', 'health', 'lifestyle', 'utilities'],
    lang: 'pt-BR',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Triagem com IA',
        short_name: 'Triagem IA',
        description: 'Iniciar orientação clínica imediata com inteligência veterinária',
        url: '/dashboard/chat',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Meus Pets',
        short_name: 'Pets',
        description: 'Ver carteirinha e prontuário dos meus animais',
        url: '/dashboard/pets',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Parceiros & Clínicas',
        short_name: 'Parceiros',
        description: 'Hospitais 24h, clínicas e pet shops próximos',
        url: '/dashboard/parceiros',
        icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}


