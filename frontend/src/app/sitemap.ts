import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://experienceplatform.in';
  const cities = ['mumbai', 'thane', 'navi-mumbai', 'powai', 'panvel', 'kalyan-dombivli', 'kanjur-marg'];
  const categories = ['FOOD', 'CULTURE', 'WORKSHOPS', 'ADVENTURE', 'HIDDEN_GEMS', 'NIGHTLIFE'];

  const cityEntries = cities.map((city) => ({
    url: `${baseUrl}/cities/${city}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  const categoryEntries = categories.map((cat) => ({
    url: `${baseUrl}/explore?cat=${cat}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/provider/portal`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/trip`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/auth/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    // Legal pages
    { url: `${baseUrl}/legal/privacy-policy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/legal/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/legal/cookies`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/legal/accessibility`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  return [
    ...staticRoutes,
    ...cityEntries,
    ...categoryEntries,
  ];
}

