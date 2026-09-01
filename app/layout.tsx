import type { Metadata, Viewport } from 'next';
import './globals.css'; // Global styles
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

export const metadata: Metadata = {
  title: 'VetPro Orienta',
  description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros e painéis para tutores, clínicas e super admin',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VetPro Orienta',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'VetPro Orienta',
    description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros e painéis para tutores, clínicas e super admin',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VetPro Orienta',
    description: 'Plataforma multi-tenant de orientação veterinária com IA, PWA, geolocalização de parceiros e painéis para tutores, clínicas e super admin',
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
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}

