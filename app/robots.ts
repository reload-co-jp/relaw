import type { MetadataRoute } from "next"
import { absoluteUrl, siteUrl } from "lib/seo"

export const dynamic = "force-static"

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: "*",
    allow: "/",
  },
  host: siteUrl,
  sitemap: absoluteUrl("/sitemap.xml"),
})

export default robots
