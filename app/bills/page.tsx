import { FC } from "react"
import { getBills } from "lib/data"
import { Section } from "components/elements/section"
import { BillList } from "components/blocks/bill-list"

export const metadata = {
  title: "法案一覧 | Relaw",
}

const Page: FC = () => {
  const bills = getBills()
  return (
    <Section title="法案一覧" count={bills.length}>
      <BillList bills={bills} />
    </Section>
  )
}

export default Page
