import { FC } from "react"
import { getLawsByEnforcementMonth } from "lib/data"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { Section } from "components/elements/section"
import { EntryList } from "components/blocks/entry-list"

export const metadata = pageMetadata({
  title: "施行された法令一覧（月別）",
  description:
    "施行された法律・政令・省令を施行月ごとに一覧で確認。月ごとの施行件数から、各月に施行された法令の一覧へ移動できます。",
  path: "/laws/enforced/",
})

const Page: FC = () => {
  const months = [...getLawsByEnforcementMonth()]
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "法令一覧", path: "/laws/" },
          { name: "施行月別", path: "/laws/enforced/" },
        ]}
      />
      <Section title="施行された法令一覧（月別）" titleAs="h1">
        <EntryList
          entries={months.map(([key, laws]) => {
            const [year, month] = key.split("-")
            return {
              id: key,
              title: `${year}年${Number(month)}月に施行された法令`,
              href: `/laws/enforced/${year}/${month}/`,
              badges: [],
              meta: [`${laws.length} 件`],
            }
          })}
        />
      </Section>
    </>
  )
}

export default Page
