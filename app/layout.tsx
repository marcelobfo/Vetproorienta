import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { LgpdConsentBanner } from '@/components/LgpdConsentBanner';

export const metadata: Metadata = {
  title: 'VetPro Orienta - Assistente Veterinário com IA',
  description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros, carteirinha digital e painéis para tutores e clínicas',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VetPro Orienta',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/apple-touch-icon.png',
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
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <PwaInstallPrompt />
        <LgpdConsentBanner />
      </body>
    </html>
  );
}


