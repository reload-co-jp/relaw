import { FC } from "react"
import { getLaws } from "lib/data"
import { Section } from "components/elements/section"
import { LawList } from "components/blocks/law-list"

export const metadata = {
  title: "法令一覧 | Relaw",
}

const Page: FC = () => {
  const laws = getLaws()
  return (
    <Section title="法令一覧" count={laws.length}>
      <LawList laws={laws} />
    </Section>
  )
}

export default Page
