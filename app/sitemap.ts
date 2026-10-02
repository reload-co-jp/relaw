import type { MetadataRoute } from "next"
import {
  getBills,
  getLaws,
  getLawsByEnforcementMonth,
  getLawsByPromulgationYear,
  getSessions,
} from "lib/data"
import { absoluteUrl } from "lib/seo"

export const dynamic = "force-static"

const staticRoutes = [
  "/",
  "/bills/",
  "/gantt/",
  "/laws/",
  "/laws/enacted/",
  "/laws/enforced/",
  "/laws/upcoming/",
  "/public-comments/",
]

const listRoutes = (): string[] => [
  ...getSessions().map((session) => `/bills/${session}/`),
  ...[...getLawsByPromulgationYear().keys()].map(
    (year) => `/laws/enacted/${year}/`
  ),
  ...[...getLawsByEnforcementMonth().keys()].map(
    (key) => `/laws/enforced/${key.replace("-", "/")}/`
  ),
]

const sitemap = (): MetadataRoute.Sitemap => [
  ...staticRoutes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "/" ? 1 : 0.8,
  })),
  ...listRoutes().map((route) => ({
    url: absoluteUrl(route),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
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
