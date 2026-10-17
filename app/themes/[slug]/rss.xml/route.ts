import { getBills, getLatestBillEvents, getLaws } from "lib/data"
import { billStatusLabels, lawTypeLabels } from "lib/labels"
import { billDescription, lawDescription } from "lib/overview"
import { absoluteUrl, compactText, siteName } from "lib/seo"
import { getTheme, getThemeItems, themes } from "lib/themes"

export const dynamic = "force-static"
export const dynamicParams = false

const ITEM_LIMIT = 50

export const generateStaticParams = () =>
  themes.map((theme) => ({ slug: theme.slug }))

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/** "2026-10-18" (JST の日付) → RFC 822 */
const rfc822 = (date: string): string =>
  new Date(`${date}T00:00:00+09:00`).toUTCString()

interface FeedItem {
  title: string
  path: string
  description: string
  /** 日付順の基準: 法令は公布日、法案は最後に記録されたイベントの日付 */
  date: string
  category: string
}

/** テーマ別 RSS 2.0。公開中の法案・法令ページのみを、日付の新しい順で出力する */
export const GET = async (
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await params
  const theme = getTheme(slug)
  if (!theme) return new Response("Not Found", { status: 404 })
  const latestEvents = getLatestBillEvents()
  const items: FeedItem[] = [
    ...getThemeItems(slug, getLaws()).flatMap((law) =>
      law.promulgatedAt
        ? [
            {
              title: `【${lawTypeLabels[law.lawType]}】${law.title}`,
              path: `/laws/${law.id}/`,
              description: compactText(lawDescription(law), 300),
              date: law.promulgatedAt,
              category: lawTypeLabels[law.lawType],
            },
          ]
        : []
    ),
    ...getThemeItems(slug, getBills()).flatMap((bill) => {
      const date = latestEvents.get(bill.id)?.date ?? bill.submittedAt
      return date
        ? [
            {
              title: `【法案・${billStatusLabels[bill.status]}】${bill.title}`,
              path: `/bills/${bill.id}/`,
              description: compactText(billDescription(bill), 300),
              date,
              category: "法案",
            },
          ]
        : []
    }),
  ]
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path)
    )
    .slice(0, ITEM_LIMIT)

  const pageUrl = absoluteUrl(`/themes/${slug}/`)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(`${theme.name}に関する法令・法案 | ${siteName}`)}</title>
<link>${pageUrl}</link>
<atom:link href="${absoluteUrl(`/themes/${slug}/rss.xml`)}" rel="self" type="application/rss+xml"/>
<description>${escapeXml(`題名に「${theme.keywords.join("」「")}」を含む法令・法案の新着（公布日・最新の審議イベント日の新しい順）`)}</description>
<language>ja</language>
${items[0] ? `<lastBuildDate>${rfc822(items[0].date)}</lastBuildDate>\n` : ""}${items
    .map(
      (item) => `<item>
<title>${escapeXml(item.title)}</title>
<link>${absoluteUrl(item.path)}</link>
<guid isPermaLink="false">${escapeXml(`${item.path}#${item.date}`)}</guid>
<description>${escapeXml(item.description)}</description>
<category>${escapeXml(item.category)}</category>
<pubDate>${rfc822(item.date)}</pubDate>
</item>`
    )
    .join("\n")}
</channel>
</rss>
`
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  })
}
