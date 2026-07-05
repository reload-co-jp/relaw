import type { Metadata } from "next"

export const siteName = "Relaw"
export const siteDescription =
  "法案、法令、パブリックコメントを横断して、提出から公布・施行までの政策ライフサイクルを追跡できるモニタリングシステム。"
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://relaw.jp"
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
      card: "summary",
      title: fullTitle,
      description,
    },
  }
}
