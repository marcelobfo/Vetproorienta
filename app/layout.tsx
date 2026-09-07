import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { LgpdConsentBanner } from '@/components/LgpdConsentBanner';

export const metadata: Metadata = {
  title: 'VetPro Orienta - Assistente Veterinário com IA',
  description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros, carteirinha digital e painéis para tutores e clínicas',
  applicationName: 'VetPro Orienta',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VetPro Orienta',
    startupImage: [
      {
        url: '/pwa-512x512.png',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icon.svg',
        color: '#2FD9A6',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'VetPro Orienta - Assistente Veterinário com IA',
    description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros, carteirinha digital e painéis para tutores e clínicas',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VetPro Orienta - Assistente Veterinário com IA',
    description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros, carteirinha digital e painéis para tutores e clínicas',
  },
};

export const viewport: Viewport = {
  themeColor: '#0A1826',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className="bg-[#0A1826]">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VetPro" />
        <meta name="application-name" content="VetPro Orienta" />
        <meta name="msapplication-TileColor" content="#0A1826" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/pwa-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/pwa-512x512.png" />
        <link rel="mask-icon" href="/icon.svg" color="#2FD9A6" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body suppressHydrationWarning className="bg-brand-bg text-brand-text min-h-screen antialiased selection:bg-brand-teal selection:text-brand-bg">
        {children}
        <PwaInstallPrompt />
        <LgpdConsentBanner />
      </body>
    </html>
  );
}


