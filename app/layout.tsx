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
      { url: '/Bika.png', type: 'image/png' },
      { url: '/Bika.png', sizes: '32x32', type: 'image/png' },
      { url: '/Bika.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/Bika.png',
    apple: [{ url: '/Bika.png', type: 'image/png' }],
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
  themeColor: '#eab308',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('bika_theme');
                  if (saved === 'light') {
                    document.documentElement.classList.add('light-mode');
                    document.documentElement.setAttribute('data-theme', 'light');
                  } else {
                    document.documentElement.classList.remove('light-mode');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="icon" href="/Bika.png" type="image/png" />
        <link rel="apple-touch-icon" href="/Bika.png" />
      </head>
      <body className={inter.className}>
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
