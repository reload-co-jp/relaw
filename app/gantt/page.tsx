import { FC, Suspense } from "react"
import { getBills, today } from "lib/data"
import { billMilestones, TERMINAL_STATUSES } from "lib/lifecycle"
import { normalizeText } from "lib/search"
import { getSearchIndex } from "lib/search-index"
import { themes } from "lib/themes"
import { pageMetadata } from "lib/seo"
import { Section } from "components/elements/section"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { LifecycleGuide } from "components/blocks/lifecycle-guide"
import { GanttChart, GanttRow } from "components/blocks/gantt-chart"

export const metadata = pageMetadata({
  title: "ガントチャート",
  description:
    "法案の提出、審議、成立、公布、施行までの進行状況をガントチャートで可視化。複数の法案の時期を比較し、状態・テーマ・期間で絞り込めます。",
  path: "/gantt/",
})

const Page: FC = () => {
  const entries = new Map(
    getSearchIndex()
      .filter((entry) => entry.kind === "bill")
      .map((entry) => [entry.id, entry])
  )
  const rows: GanttRow[] = getBills()
    .filter((bill) => bill.submittedAt)
    .map((bill) => ({
      // クライアントへ送る量を抑えるため、検索対象は題名と議案番号のみ
      entry: {
        ...entries.get(bill.id)!,
        summary: undefined,
        text: normalizeText(`${bill.title} ${bill.billNumber ?? ""}`),
      },
      status: bill.status,
      terminated: TERMINAL_STATUSES.includes(bill.status),
      milestones: billMilestones(bill),
    }))
  return (
    <>
      <Breadcrumbs items={[{ name: "ガントチャート", path: "/gantt/" }]} />
      <LifecycleGuide />
      <Section title="法案ガントチャート" count={rows.length} titleAs="h1">
        <Suspense fallback={<p>チャートを読み込み中…</p>}>
          <GanttChart rows={rows} themes={themes} builtOn={today()} />
        </Suspense>
      </Section>
    </>
  )
}

export default Page
