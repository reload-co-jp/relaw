import { FC } from "react"
import {
  getBillsUnderDeliberation,
  getEnactedBills,
  getRecentlyPromulgatedLaws,
  getRecentlySubmittedBills,
  getUpcomingEnforcementLaws,
} from "lib/data"
import { Section } from "components/elements/section"
import { BillList } from "components/blocks/bill-list"
import { LawList } from "components/blocks/law-list"

const Page: FC = () => {
  const submitted = getRecentlySubmittedBills()
  const deliberating = getBillsUnderDeliberation()
  const enacted = getEnactedBills()
  const promulgated = getRecentlyPromulgatedLaws()
  const upcoming = getUpcomingEnforcementLaws()
  return (
    <>
      <Section title="新しく提出された法案" count={submitted.length}>
        <BillList bills={submitted} />
      </Section>
      <Section title="現在審議中の法案" count={deliberating.length}>
        <BillList bills={deliberating} />
      </Section>
      <Section title="成立した法案" count={enacted.length}>
        <BillList bills={enacted} />
      </Section>
      <Section title="公布された法令" count={promulgated.length}>
        <LawList laws={promulgated} />
      </Section>
      <Section title="近日施行される法令" count={upcoming.length}>
        <LawList laws={upcoming} />
      </Section>
    </>
  )
}

export default Page
