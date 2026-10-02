import { FC } from "react"
import { getLawsByPromulgationYear } from "lib/data"
import { lawTypeLabels } from "lib/labels"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { Section } from "components/elements/section"
import { EntryList } from "components/blocks/entry-list"

export const metadata = pageMetadata({
  title: "公布された法令一覧（年別）",
  description:
    "公布された法律・政令・省令を公布年ごとに一覧で確認。年ごとの公布件数と法令種別の内訳から、各年の法令一覧へ移動できます。",
  path: "/laws/enacted/",
})

const Page: FC = () => {
  const years = [...getLawsByPromulgationYear()]
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "法令一覧", path: "/laws/" },
          { name: "公布年別", path: "/laws/enacted/" },
        ]}
      />
      <Section title="公布された法令一覧（年別）" titleAs="h1">
        <EntryList
          entries={years.map(([year, laws]) => ({
            id: year,
            title: `${year}年に公布された法令`,
            href: `/laws/enacted/${year}/`,
            badges: [],
            meta: [
              `${laws.length} 件`,
              ...Object.entries(
                Object.groupBy(laws, (law) => lawTypeLabels[law.lawType])
              ).map(([type, group]) => `${type} ${group?.length ?? 0}`),
            ],
          }))}
        />
      </Section>
    </>
  )
}

export default Page
