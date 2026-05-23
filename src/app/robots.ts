import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-identity';

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/', '/conta'],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
