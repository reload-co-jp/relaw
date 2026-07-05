import type { Bill, BillEvent, BillStatus } from "../../lib/types.ts"
import {
  fetchText,
  hashId,
  loadCollection,
  nowIso,
  saveCollection,
  stripTags,
  upsert,
  type CollectorResult,
} from "./lib.ts"
import { dietSessions } from "./config.ts"

const SHUGIIN_BASE =
  "https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/"

/** 衆議院の審議経過表記 → BillStatus */
export const statusFromKeika = (keika: string): BillStatus => {
  if (/成立/.test(keika)) return "passed_diet"
  if (/否決/.test(keika)) return "rejected"
  if (/撤回/.test(keika)) return "withdrawn"
  if (/廃案|審査未了/.test(keika)) return "expired"
  if (/参議院で審議中|参議院へ送付|衆議院通過/.test(keika))
    return "passed_lower_house"
  if (/委員会|審査中|付託/.test(keika)) return "committee_review"
  if (/継続|閉会中/.test(keika)) return "committee_review"
  return "submitted"
}

const eventTypeByStatus: Partial<Record<BillStatus, BillEvent["type"]>> = {
  passed_diet: "passed_diet",
  rejected: "rejected",
  withdrawn: "withdrawn",
  expired: "expired",
  passed_lower_house: "passed_lower_house",
  committee_review: "committee_referral",
  submitted: "submitted",
}

/**
 * 衆議院の議案一覧を国会回次ごとに巡回し、
 * 法案名と議案番号で bills.json と突合、状態変更を bill-events.json に追記する。
 */
export const collectShugiin = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  let bills = loadCollection<Bill>("bills.json")
  let events = loadCollection<BillEvent>("bill-events.json")
  let updated = 0
  const today = new Date().toISOString().slice(0, 10)

  for (const session of dietSessions) {
    const pageUrl = `${SHUGIIN_BASE}kaiji${session}.htm`
    let html: string
    try {
      html = await fetchText(pageUrl)
    } catch (error) {
      errors.push(`session ${session}: ${String(error)}`)
      continue
    }

    const rows = html.split(/<tr[\s>]/i).slice(1)
    for (const row of rows) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        stripTags(m[1])
      )
      // 衆議院の議案一覧: [提出回次, 番号, 議案件名, 審議状況, ...]
      if (cells.length < 4) continue
      const [, number, title, keika] = cells
      if (!title || !/法律案|法案/.test(title)) continue

      const status = statusFromKeika(keika ?? "")
      const proposerType = /衆法/.test(row)
        ? "representative"
        : /参法/.test(row)
          ? "councillor"
          : "cabinet"
      const billNumber = number
        ? `第${session}回国会 議案番号${number}`
        : undefined

      const existing = bills.find(
        (bill) =>
          bill.dietSession === session &&
          (bill.title === title ||
            (billNumber && bill.billNumber === billNumber))
      )
      const billId = existing?.id ?? `bill-${session}-shugiin-${hashId(title)}`

      const statusChanged = existing !== undefined && existing.status !== status
      const bill: Bill = {
        ...(existing ?? {
          id: billId,
          title,
          dietSession: session,
          createdAt: nowIso(),
        }),
        billNumber: existing?.billNumber ?? billNumber,
        proposerType: existing?.proposerType ?? proposerType,
        status,
        sourceUrl: existing?.sourceUrl ?? pageUrl,
        updatedAt: nowIso(),
      }
      const result = upsert(bills, bill)
      bills = result.collection
      if (result.changed) updated += 1

      if ((statusChanged || !existing) && eventTypeByStatus[status]) {
        const event: BillEvent = {
          id: `event-${billId}-${status}-${today}`,
          billId,
          type: eventTypeByStatus[status],
          date: today,
          chamber: "lower",
          description: keika ? `衆議院 審議経過: ${keika}` : undefined,
          sourceUrl: pageUrl,
          createdAt: nowIso(),
        }
        const eventResult = upsert(events, event)
        events = eventResult.collection
        if (eventResult.changed) updated += 1
      }
    }
  }

  saveCollection("bills.json", bills)
  saveCollection("bill-events.json", events)
  return { source: "衆議院 議案情報", updated, errors }
}
