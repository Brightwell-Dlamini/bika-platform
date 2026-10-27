import type { MetadataRoute } from 'next';

/**
 * Public sitemap only — officer/admin paths stay out of robots.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    process.env.SITE_URL?.replace(/\/$/, '') ||
    'https://bika.eca-sz.org';

  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/report`, lastModified: now, changeFrequency: 'weekly', priority: 0.95 },
    { url: `${base}/track`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/hotlines`, lastModified: now, changeFrequency: 'monthly', priority: 0.85 },
  ];
}
