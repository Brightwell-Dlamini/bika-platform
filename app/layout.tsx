import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers/AppProviders';
import { PwaRegister } from './components/PwaRegister';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BIKA – Eswatini Real-Time Incident & Public Safety Platform',
  description:
    'Kingdom of Eswatini official integrated real-time incident, transport and trade reporting platform. See something, say something.',
  icons: {
    icon: [
      { url: '/api/pwa-icon/192?purpose=any', type: 'image/png', sizes: '192x192' },
      { url: '/api/pwa-icon/512?purpose=any', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/api/pwa-icon/192?purpose=any',
    apple: [{ url: '/api/pwa-icon/180?purpose=any', type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BIKA',
  },
  applicationName: 'BIKA',
  openGraph: {
    title: 'BIKA – Eswatini Real-Time Incident & Public Safety Platform',
    description:
      'Report transport, food-trade, and public-safety issues. Track cases with your BIKA reference.',
    type: 'website',
    locale: 'en_SZ',
  },
};

export const viewport: Viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/api/pwa-icon/180?purpose=any" />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <AppProviders>
          {children}
          <PwaRegister />
        </AppProviders>
      </body>
    </html>
  );
}
