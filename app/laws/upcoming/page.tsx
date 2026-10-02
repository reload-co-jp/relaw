import { FC } from "react"
import { getUpcomingLaws } from "lib/data"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { Section } from "components/elements/section"
import { LawList } from "components/blocks/law-list"

export const metadata = pageMetadata({
  title: "施行予定の法令一覧",
  description:
    "公布済みで、これから施行される予定の法律・政令・省令を施行日の近い順に一覧で確認。各法令の公布日・施行予定日・条文へのリンクを掲載。",
  path: "/laws/upcoming/",
})

const Page: FC = () => {
  const laws = getUpcomingLaws()
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "法令一覧", path: "/laws/" },
          { name: "施行予定", path: "/laws/upcoming/" },
        ]}
      />
      <Section title="施行予定の法令一覧" count={laws.length} titleAs="h1">
        <LawList laws={laws} />
      </Section>
    </>
  )
}

export default Page
