import { FC } from "react"
import { getBills, getLatestBillEvents } from "lib/data"
import { Section } from "components/elements/section"
import { billEntry, billSearchText } from "components/blocks/bill-list"
import { BillSearchList } from "components/blocks/bill-search-list"
import { pageMetadata } from "lib/seo"

export const metadata = pageMetadata({
  title: "法案一覧",
  description:
    "国会提出法案を提出日、審議状況、成立、公布、施行まで一覧で確認。各法案の概要、時系列イベント、関連資料を追跡できます。",
  path: "/bills/",
})

const Page: FC = () => {
  const bills = getBills()
  const latestEvents = getLatestBillEvents()
  const entries = bills.map((bill) => {
    const latestEvent = latestEvents.get(bill.id)
    return {
      ...billEntry(bill, latestEvent),
      searchText: billSearchText(bill, latestEvent),
    }
  })
  return (
    <Section title="法案一覧" count={bills.length} titleAs="h1">
      <BillSearchList entries={entries} />
    </Section>
  )
}

export default Page
