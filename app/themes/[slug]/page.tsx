import { FC } from "react"
import { notFound } from "next/navigation"
import { getBills, getLaws } from "lib/data"
import { absoluteUrl, pageMetadata } from "lib/seo"
import { WatchButton } from "components/elements/watch-button"
import { getTheme, getThemeItems, themes } from "lib/themes"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"
import { EmptyMessage, Section } from "components/elements/section"
import { LawsByType } from "components/blocks/law-list"
import { BillList } from "components/blocks/bill-list"

type Params = Promise<{ slug: string }>

export const generateStaticParams = () =>
  themes.map((theme) => ({ slug: theme.slug }))

export const generateMetadata = async ({ params }: { params: Params }) => {
  const { slug } = await params
  const theme = getTheme(slug)
  if (!theme)
    return pageMetadata({
      title: "テーマ別",
      description: "指定されたテーマは見つかりません。",
      path: "/themes/",
    })
  const laws = getThemeItems(slug, getLaws())
  const bills = getThemeItems(slug, getBills())
  const metadata = pageMetadata({
    title: `${theme.name}に関する法令・法案一覧`,
    description: `${theme.name}に関する法令${laws.length}件・法案${bills.length}件の一覧。題名に「${theme.keywords.join("」「")}」を含む法律・政令・省令と国会提出法案の公布日・施行日・審議状況を確認できます。`,
    path: `/themes/${slug}/`,
  })
  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: {
        "application/rss+xml": [
          {
            url: absoluteUrl(`/themes/${slug}/rss.xml`),
            title: `${theme.name}に関する法令・法案 | Relaw`,
          },
        ],
      },
    },
  }
}

const Page: FC<{ params: Params }> = async ({ params }) => {
  const { slug } = await params
  const theme = getTheme(slug)
  if (!theme) notFound()
  const laws = getThemeItems(slug, getLaws()).sort((a, b) =>
    (b.promulgatedAt ?? "").localeCompare(a.promulgatedAt ?? "")
  )
  const bills = getThemeItems(slug, getBills())
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "テーマ別", path: "/themes/" },
          { name: theme.name, path: `/themes/${slug}/` },
        ]}
      />
      <h1 className="detail-title">{theme.name}に関する法令・法案一覧</h1>
      <p className="status-note">
        題名に「{theme.keywords.join("」「")}
        」を含む法令・法案を掲載（題名のキーワード一致による分類のため、内容上の関連を保証するものではありません）。
      </p>
      <p className="detail-links">
        <WatchButton
          item={{
            id: `theme-${slug}`,
            kind: "theme",
            title: `${theme.name}に関する法令・法案`,
            href: `/themes/${slug}/`,
          }}
        />{" "}
        <a href={`/themes/${slug}/rss.xml`} className="text-link">
          RSS フィード
        </a>
      </p>
      <LinkChips
        links={themes.map((item) => ({
          label: item.name,
          href: `/themes/${item.slug}/`,
        }))}
      />
      {laws.length === 0 && bills.length === 0 && (
        <EmptyMessage>該当する法令・法案なし</EmptyMessage>
      )}
      <LawsByType laws={laws} suffix={`（${theme.name}）`} />
      {bills.length > 0 && (
        <Section title={`${theme.name}に関する法案`} count={bills.length}>
          <BillList bills={bills} />
        </Section>
      )}
    </>
  )
}

export default Page
