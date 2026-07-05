import { FC } from "react"
import { getLaws } from "lib/data"
import { Section } from "components/elements/section"
import { LawList } from "components/blocks/law-list"
import { pageMetadata } from "lib/seo"

export const metadata = pageMetadata({
  title: "法令一覧",
  description:
    "公布・施行された法令を一覧で確認。法令番号、公布日、施行日、改正履歴、条文、関連法案を追跡できます。",
  path: "/laws/",
})

const Page: FC = () => {
  const laws = getLaws()
  return (
    <Section title="法令一覧" count={laws.length}>
      <LawList laws={laws} />
    </Section>
  )
}

export default Page
