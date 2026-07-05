import type { MetadataRoute } from "next"
import { getBills, getLaws } from "lib/data"
import { absoluteUrl } from "lib/seo"

export const dynamic = "force-static"

const staticRoutes = ["/", "/bills/", "/gantt/", "/laws/", "/public-comments/"]

const sitemap = (): MetadataRoute.Sitemap => [
  ...staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "/" ? 1 : 0.8,
  })),
  ...getBills().map((bill) => ({
    url: absoluteUrl(`/bills/${bill.id}/`),
    lastModified: new Date(bill.updatedAt),
    changeFrequency: "daily" as const,
    priority: 0.7,
  })),
  ...getLaws().map((law) => ({
    url: absoluteUrl(`/laws/${law.id}/`),
    lastModified: new Date(law.updatedAt),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  })),
]

export default sitemap
