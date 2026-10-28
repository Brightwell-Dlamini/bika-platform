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
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: [{ url: '/icons/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
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
      'Report transport, food-trade, and public-safety issues. Track cases with your BIKA reference ID.',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.remove('light-mode');
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                  localStorage.setItem('bika_theme', 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180" />
      </head>
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-yellow-500 focus:text-slate-950 focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
        >
          Skip to main content
        </a>
        <AppProviders>
          {children}
          <PwaRegister />
        </AppProviders>
      </body>
    </html>
  );
}
