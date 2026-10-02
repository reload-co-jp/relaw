import { FC } from "react"
import { getBills, getLaws } from "lib/data"
import { pageMetadata } from "lib/seo"
import { getThemeItems, themes } from "lib/themes"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { Section } from "components/elements/section"
import { EntryList } from "components/blocks/entry-list"

export const metadata = pageMetadata({
  title: "テーマ別の法令・法案一覧",
  description:
    "AI、個人情報、サイバーセキュリティ、労働、税、金融、医療、教育、外国人・在留資格などのテーマ別に、関連する法令・法案を一覧で確認できます。",
  path: "/themes/",
})

const Page: FC = () => {
  const laws = getLaws()
  const bills = getBills()
  return (
    <>
      <Breadcrumbs items={[{ name: "テーマ別", path: "/themes/" }]} />
      <Section title="テーマ別の法令・法案一覧" titleAs="h1">
        <EntryList
          entries={themes.map((theme) => ({
            id: theme.slug,
            title: `${theme.name}に関する法令・法案`,
            href: `/themes/${theme.slug}/`,
            badges: [],
            meta: [
              `法令 ${getThemeItems(theme.slug, laws).length} 件`,
              `法案 ${getThemeItems(theme.slug, bills).length} 件`,
            ],
          }))}
        />
      </Section>
    </>
  )
}

export default Page
