import { FC } from "react"
import Link from "next/link"
import { getBills, getLatestBillEvents } from "lib/data"
import type { Bill } from "lib/types"
import { billStatusLabels } from "lib/labels"
import { Section } from "components/elements/section"
import { LifecycleGuide } from "components/blocks/lifecycle-guide"

export const metadata = {
  title: "ガントチャート | Relaw",
}

// dataviz 検証済みパレット (dark surface #151920: 明度バンド・彩度・CVD・コントラスト全PASS)
const PHASE_COLORS = {
  deliberation: "#b98733",
  toPromulgation: "#35a065",
  toEnforcement: "#0d99a5",
  terminated: "#77726a",
} as const

const PHASE_LABELS: Record<keyof typeof PHASE_COLORS, string> = {
  deliberation: "審議 (提出 → 成立)",
  toPromulgation: "成立 → 公布",
  toEnforcement: "公布 → 施行",
  terminated: "廃案・撤回・否決",
}

const TERMINAL_STATUSES = ["withdrawn", "rejected", "expired"]

interface Segment {
  from: string
  to: string
  phase: keyof typeof PHASE_COLORS
}

const billSegments = (bill: Bill, fallbackEnd: string): Segment[] => {
  if (!bill.submittedAt) return []
  if (TERMINAL_STATUSES.includes(bill.status))
    return [
      { from: bill.submittedAt, to: fallbackEnd, phase: "terminated" },
    ]
  const boundaries: { at: string; phase: keyof typeof PHASE_COLORS }[] = [
    { at: bill.submittedAt, phase: "deliberation" },
  ]
  if (bill.enactedAt)
    boundaries.push({ at: bill.enactedAt, phase: "toPromulgation" })
  if (bill.promulgatedAt)
    boundaries.push({ at: bill.promulgatedAt, phase: "toEnforcement" })
  const end = bill.enforcedAt ?? fallbackEnd
  return boundaries
    .map((boundary, index) => ({
      from: boundary.at,
      to: boundaries[index + 1]?.at ?? end,
      phase: boundary.phase,
    }))
    .filter((segment) => segment.from <= segment.to)
}

const tooltip = (bill: Bill): string =>
  [
    billStatusLabels[bill.status],
    bill.submittedAt && `提出 ${bill.submittedAt}`,
    bill.enactedAt && `成立 ${bill.enactedAt}`,
    bill.promulgatedAt && `公布 ${bill.promulgatedAt}`,
    bill.enforcedAt && `施行 ${bill.enforcedAt}`,
  ]
    .filter(Boolean)
    .join(" / ")

const Page: FC = () => {
  const today = new Date().toISOString().slice(0, 10)
  const latestEvents = getLatestBillEvents()
  const bills = getBills()
    .filter((bill) => bill.submittedAt)
    .sort((a, b) =>
      (b.submittedAt as string).localeCompare(a.submittedAt as string)
    )

  const fallbackEnd = (bill: Bill): string =>
    TERMINAL_STATUSES.includes(bill.status)
      ? (latestEvents.get(bill.id)?.date ?? today)
      : today

  const dates = bills.flatMap((bill) =>
    billSegments(bill, fallbackEnd(bill)).flatMap((s) => [s.from, s.to])
  )
  const minDate = dates.reduce((a, b) => (a < b ? a : b), today)
  const maxDate = dates.reduce((a, b) => (a > b ? a : b), today)
  const rangeStart = Date.parse(minDate)
  const rangeEnd = Date.parse(maxDate)
  const position = (date: string): number =>
    ((Date.parse(date) - rangeStart) / (rangeEnd - rangeStart)) * 100

  // 月境界の目盛り (多すぎる場合は間引いてラベル)
  const ticks: { position: number; label: string; isYearStart: boolean }[] = []
  const cursor = new Date(rangeStart)
  cursor.setUTCDate(1)
  if (cursor.getTime() < rangeStart) cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  while (cursor.getTime() <= rangeEnd) {
    ticks.push({
      position: ((cursor.getTime() - rangeStart) / (rangeEnd - rangeStart)) * 100,
      label:
        cursor.getUTCMonth() === 0
          ? `${cursor.getUTCFullYear()}年1月`
          : `${cursor.getUTCMonth() + 1}月`,
      isYearStart: cursor.getUTCMonth() === 0,
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  const labelStep = Math.ceil(ticks.length / 12)

  return (
    <>
      <LifecycleGuide />
      <Section title="法案ガントチャート" count={bills.length}>
      <div className="gantt-legend">
        {(
          Object.keys(PHASE_COLORS) as (keyof typeof PHASE_COLORS)[]
        ).map((phase) => (
          <span key={phase} className="gantt-legend-item">
            <span
              className="gantt-legend-swatch"
              style={{ backgroundColor: PHASE_COLORS[phase] }}
            />
            {PHASE_LABELS[phase]}
          </span>
        ))}
        <span className="gantt-legend-item">
          <span className="gantt-legend-today" />
          今日
        </span>
      </div>
      <div className="gantt">
        <div className="gantt-labels">
          <div className="gantt-axis-spacer" />
          {bills.map((bill) => (
            <Link
              key={bill.id}
              href={`/bills/${bill.id}/`}
              className="gantt-label"
              title={bill.title}
            >
              {bill.title}
            </Link>
          ))}
        </div>
        <div className="gantt-plot">
          <div className="gantt-axis">
            {ticks.map(
              (tick, index) =>
                (tick.isYearStart ||
                  (index % labelStep === 0 &&
                    !ticks[index - 1]?.isYearStart &&
                    !ticks[index + 1]?.isYearStart)) && (
                  <span
                    key={tick.label + index}
                    className="gantt-axis-label"
                    style={{ left: `${tick.position}%` }}
                  >
                    {tick.label}
                  </span>
                )
            )}
          </div>
          <div className="gantt-body">
            {ticks.map((tick, index) => (
              <span
                key={`grid-${index}`}
                className="gantt-gridline"
                style={{ left: `${tick.position}%` }}
              />
            ))}
            <span
              className="gantt-today"
              style={{ left: `${position(today)}%` }}
            />
            {bills.map((bill) => (
              <div key={bill.id} className="gantt-row" title={tooltip(bill)}>
                {billSegments(bill, fallbackEnd(bill)).map((segment) => (
                  <span
                    key={segment.phase}
                    className="gantt-seg"
                    style={{
                      backgroundColor: PHASE_COLORS[segment.phase],
                      left: `${position(segment.from)}%`,
                      width: `${Math.max(
                        position(segment.to) - position(segment.from),
                        0.15
                      )}%`,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      </Section>
    </>
  )
}

export default Page
