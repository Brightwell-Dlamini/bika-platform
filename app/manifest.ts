import type { MetadataRoute } from 'next';

/**
 * Served by Next as /manifest.webmanifest with application/manifest+json.
 * Prefer this over public/manifest.json for installability.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'BIKA - Eswatini Incident Platform',
    short_name: 'BIKA',
    description:
      'Kingdom of Eswatini real-time incident, transport and trade reporting platform',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#020617',
    orientation: 'any',
    lang: 'en',
    categories: ['utilities', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
