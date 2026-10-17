/**
 * 法案・法令の経過 (タイムライン) と主要日付。詳細ページのタイムラインとガントチャートで共有する。
 * 日付は公的データに記録されたもののみ使い、未記録の日付は推定しない (state: "unknown")。
 */
import { getBillEvents, getLawVersions, today } from "./data"
import { billEventTypeDescriptions, billEventTypeLabels } from "./labels"
import { BillEnforcement, getBillRelations } from "./relations"
import type { Bill, BillEventType, Law } from "./types"

export interface Source {
  name: string
  url?: string
}

export interface TimelineItem {
  key: string
  /** 未定・未確認なら undefined */
  date?: string
  label: string
  description?: string
  note?: string
  state: "done" | "scheduled" | "unknown"
  source?: Source
}

const sourceNames: [RegExp, string][] = [
  [/sangiin\.go\.jp/, "参議院 議案情報"],
  [/shugiin\.go\.jp/, "衆議院 議案情報"],
  [/laws\.e-gov\.go\.jp|elaws\.e-gov\.go\.jp/, "e-Gov 法令検索"],
  [/public-comment\.e-gov\.go\.jp/, "e-Gov パブリックコメント"],
  [/kanpo\.go\.jp/, "官報"],
  [/cas\.go\.jp/, "内閣官房"],
  [/kokkai\.ndl\.go\.jp/, "国会会議録検索システム"],
]

export const sourceOf = (url?: string): Source | undefined =>
  url
    ? {
        name: sourceNames.find(([pattern]) => pattern.test(url))?.[1] ?? "出典",
        url,
      }
    : undefined

const TERMINAL_EVENTS: BillEventType[] = ["withdrawn", "rejected", "expired"]
export const TERMINAL_STATUSES: Bill["status"][] = [
  "withdrawn",
  "rejected",
  "expired",
]

const dateState = (date: string): TimelineItem["state"] =>
  date > today() ? "scheduled" : "done"

const enforcementItem = (
  enforcement: BillEnforcement,
  multiple: boolean
): TimelineItem => ({
  key: `enforced-${enforcement.version.id}`,
  date: enforcement.date,
  label: dateState(enforcement.date) === "scheduled" ? "施行予定" : "施行",
  description: billEventTypeDescriptions.enforced,
  note: multiple ? `${enforcement.law.title}（改正部分の施行）` : undefined,
  state: dateState(enforcement.date),
  source: sourceOf(enforcement.version.sourceUrl ?? enforcement.law.sourceUrl),
})

export interface BillMilestones {
  submitted?: string
  enacted?: string
  promulgated?: string
  /** 施行日 (一部施行・改正対象ごとに複数ありうる。重複日付は除く) */
  enforcements: string[]
  /** 撤回・否決・廃案の日付 (イベントに記録がある場合のみ) */
  terminated?: { date: string; label: string }
  /** 最後に記録されたイベントの日付 */
  lastEventDate?: string
}

export const billMilestones = (bill: Bill): BillMilestones => {
  const events = getBillEvents(bill.id)
  const terminal = [...events]
    .reverse()
    .find((event) => TERMINAL_EVENTS.includes(event.type))
  return {
    submitted: bill.submittedAt,
    enacted: bill.enactedAt,
    promulgated: bill.promulgatedAt,
    enforcements: [
      ...new Set(
        getBillRelations(bill.id).enforcements.map(
          (enforcement) => enforcement.date
        )
      ),
    ],
    terminated: terminal && {
      date: terminal.date,
      label: billEventTypeLabels[terminal.type],
    },
    lastEventDate: events[events.length - 1]?.date,
  }
}

/** 法案の経過。記録済みイベント + e-Gov 版データの施行日 + 未確認の施行日 */
export const billTimeline = (bill: Bill): TimelineItem[] => {
  const { enforcements } = getBillRelations(bill.id)
  const items: TimelineItem[] = getBillEvents(bill.id).map((event) => ({
    key: event.id,
    date: event.date,
    label: billEventTypeLabels[event.type],
    description: billEventTypeDescriptions[event.type],
    note: event.description,
    state: "done",
    source: sourceOf(event.sourceUrl),
  }))
  const multiple = new Set(enforcements.map((item) => item.law.id)).size > 1
  items.push(...enforcements.map((item) => enforcementItem(item, multiple)))
  if (bill.promulgatedAt && enforcements.length === 0)
    items.push({
      key: "enforced-unknown",
      label: "施行",
      description:
        "施行日は公的データ上で未確認です。法律の附則や施行期日を定める政令で定められます",
      state: "unknown",
    })
  return items.sort((a, b) =>
    (a.date ?? "9999").localeCompare(b.date ?? "9999")
  )
}

export const lawTimeline = (law: Law): TimelineItem[] => {
  const source = sourceOf(law.sourceUrl)
  const originals = getLawVersions(law.id).filter(
    (version) => !version.amendmentLawNumber && version.enforcedAt
  )
  const enforcedDates = [
    ...new Set(originals.map((version) => version.enforcedAt as string)),
  ]
  const items: TimelineItem[] = []
  if (law.promulgatedAt)
    items.push({
      key: "promulgated",
      date: law.promulgatedAt,
      label: "公布",
      description: billEventTypeDescriptions.promulgated,
      note: law.lawNumber,
      state: "done",
      source,
    })
  if (enforcedDates.length === 0)
    items.push({
      key: "enforced-unknown",
      label: "施行",
      description: "施行日は公的データ上で未確認です",
      state: "unknown",
    })
  for (const date of enforcedDates)
    items.push({
      key: `enforced-${date}`,
      date,
      label: dateState(date) === "scheduled" ? "施行予定" : "施行",
      description: billEventTypeDescriptions.enforced,
      note: enforcedDates.length > 1 ? "一部施行" : undefined,
      state: dateState(date),
      source,
    })
  if (law.repealedAt)
    items.push({
      key: "repealed",
      date: law.repealedAt,
      label: "廃止",
      state: dateState(law.repealedAt),
      source,
    })
  return items.sort((a, b) =>
    (a.date ?? "9999").localeCompare(b.date ?? "9999")
  )
}

/** 確定日付のある次の手続き (今日以降で最も近いもの)。無ければ undefined */
export const nextStep = (items: TimelineItem[]): TimelineItem | undefined =>
  items.find((item) => item.state === "scheduled")
