import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-identity';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const paths = [
    '',
    '/entrar',
    '/precos',
    '/manual',
    '/privacidade',
    '/demo',
    '/criterios',
    '/bases',
    '/resultados',
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
