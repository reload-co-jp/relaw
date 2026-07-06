import type { Metadata } from "next"

export const siteName = "Relaw"
export const siteDescription =
  "法案、法令、パブリックコメントを横断して、提出から公布・施行までの政策ライフサイクルを追跡できるモニタリングシステム。"
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://relaw.reload.co.jp"
).replace(/\/$/, "")

export const absoluteUrl = (path: string): string =>
  `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`

export const compactText = (text: string, maxLength = 155): string => {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1)}…`
}

export const pageMetadata = ({
  title,
  description,
  path,
}: {
  title?: string
  description: string
  path: string
}): Metadata => {
  const fullTitle = title ? `${title} | ${siteName}` : siteName
  const url = absoluteUrl(path)
  return {
    title: { absolute: fullTitle },
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName,
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
  }
}

export const websiteJsonLd = (): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: `${siteUrl}/`,
  description: siteDescription,
  inLanguage: "ja",
  publisher: {
    "@type": "Organization",
    name: siteName,
    url: `${siteUrl}/`,
  },
})

export const breadcrumbJsonLd = (
  items: { name: string; path: string }[]
): Record<string, unknown> => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
})

export const legislationJsonLd = ({
  name,
  path,
  description,
  identifier,
  datePublished,
  legislationDate,
  legislationType,
  sourceUrl,
}: {
  name: string
  path: string
  description?: string
  identifier?: string
  datePublished?: string
  legislationDate?: string
  legislationType?: string
  sourceUrl?: string
}): Record<string, unknown> => {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Legislation",
    name,
    url: absoluteUrl(path),
    inLanguage: "ja",
    legislationJurisdiction: {
      "@type": "Country",
      name: "日本",
    },
  }
  if (description) data.description = description
  if (identifier) data.legislationIdentifier = identifier
  if (datePublished) data.datePublished = datePublished
  if (legislationDate) data.legislationDate = legislationDate
  if (legislationType) data.legislationType = legislationType
  if (sourceUrl) data.sameAs = sourceUrl
  return data
}
