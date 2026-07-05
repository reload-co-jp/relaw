import { FC } from "react"
import { getBills } from "lib/data"
import { Section } from "components/elements/section"
import { BillList } from "components/blocks/bill-list"
import { pageMetadata } from "lib/seo"

export const metadata = pageMetadata({
  title: "法案一覧",
  description:
    "国会提出法案を提出日、審議状況、成立、公布、施行まで一覧で確認。各法案の概要、時系列イベント、関連資料を追跡できます。",
  path: "/bills/",
})

const Page: FC = () => {
  const bills = getBills()
  return (
    <Section title="法案一覧" count={bills.length}>
      <BillList bills={bills} />
    </Section>
  )
}

export default Page
