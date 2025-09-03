import { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Robots {
  const baseUrl = "https://meteo.jerukagunglabs.web.id"

  return {
    rules: {
      userAgent: "*",
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}