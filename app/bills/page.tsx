import { FC } from "react"
import { getBills, getSessions } from "lib/data"
import { Section } from "components/elements/section"
import { BillList } from "components/blocks/bill-list"
import { SearchForm } from "components/blocks/search-form"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"

export const metadata = pageMetadata({
  title: "法案一覧",
  description:
    "国会提出法案を提出日、審議状況、成立、公布、施行まで一覧で確認。各法案の概要、時系列イベント、関連資料を追跡できます。",
  path: "/bills/",
})

const Page: FC = () => {
  const bills = getBills()
  return (
    <>
      <Breadcrumbs items={[{ name: "法案一覧", path: "/bills/" }]} />
      <Section title="法案一覧" count={bills.length} titleAs="h1">
        <LinkChips
          links={getSessions().map((session) => ({
            label: `第${session}回国会`,
            href: `/bills/${session}/`,
          }))}
        />
        <SearchForm
          label="法案を検索"
          placeholder="法案名・議案番号・提出者・キーワード"
          type="bill"
        />
        <BillList bills={bills} />
      </Section>
    </>
  )
}

export default Page
