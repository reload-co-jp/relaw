import type { Bill, BillEvent, BillStatus } from "../../lib/types.ts"
import {
  fetchText,
  formatBillNumber,
  hashId,
  loadCollection,
  nowIso,
  proposerTypeByGianType,
  saveCollection,
  stripTags,
  upsert,
  type CollectorResult,
  type GianType,
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
  if (/参議院で審議中|参議院へ送付|衆議院通過|本院議了|衆議院議了/.test(keika))
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

    // 「衆法の一覧」等の見出しで区切られたテーブルごとに議案種別が決まる
    const chunks = html.split(/<tr[\s>]/i)
    let gianType: GianType | undefined
    for (const row of chunks) {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
        stripTags(m[1])
      )
      // チャンク末尾に次テーブルの見出しが含まれるため、行を処理してから種別を更新する
      const updateGianType = () => {
        const heading = [
          ...row.matchAll(/(衆法|参法|閣法|予算|条約|承認|承諾|決算|決議)の一覧/g),
        ].at(-1)?.[1]
        if (heading)
          gianType =
            heading in proposerTypeByGianType
              ? (heading as GianType)
              : undefined
      }
      // 衆議院の議案一覧: [提出回次, 番号, 議案件名, 審議状況, ...]
      if (cells.length < 4 || !gianType) {
        updateGianType()
        continue
      }
      const [submittedSessionText, numberText, title, keika] = cells
      if (!title || !/法律案|法案/.test(title)) {
        updateGianType()
        continue
      }

      const status = statusFromKeika(keika ?? "")
      const proposerType = proposerTypeByGianType[gianType]
      const submittedSession = Number(submittedSessionText)
      const submittedNumber = Number(numberText)
      const hasIdentity = submittedSession > 0 && submittedNumber > 0
      const billNumber = hasIdentity
        ? formatBillNumber(submittedSession, gianType, submittedNumber)
        : undefined
      updateGianType()

      // 継続審査法案は (提出回次, 種別, 提出番号) で回次をまたいで同定する
      const existing =
        (hasIdentity
          ? bills.find(
              (bill) =>
                bill.submittedSession === submittedSession &&
                bill.submittedNumber === submittedNumber &&
                bill.proposerType === proposerType
            )
          : undefined) ??
        bills.find(
          (bill) =>
            bill.dietSession === session &&
            (bill.title === title ||
              (billNumber && bill.billNumber === billNumber))
        )
      // より新しい回次で審議済みのエントリを過去回次の一覧で上書きしない
      if (existing?.dietSession !== undefined && existing.dietSession > session)
        continue
      const billId = existing?.id ?? `bill-${session}-shugiin-${hashId(title)}`

      // 官報・e-Gov 側で公布・施行まで進んでいる場合は後退させない
      const protectedStatuses: BillStatus[] = ["promulgated", "enforced"]
      const nextStatus =
        existing &&
        protectedStatuses.includes(existing.status) &&
        !protectedStatuses.includes(status)
          ? existing.status
          : status

      const statusChanged =
        existing !== undefined && existing.status !== nextStatus
      const bill: Bill = {
        ...(existing ?? {
          id: billId,
          title,
          createdAt: nowIso(),
        }),
        dietSession: session,
        submittedSession: hasIdentity
          ? submittedSession
          : existing?.submittedSession,
        submittedNumber: hasIdentity
          ? submittedNumber
          : existing?.submittedNumber,
        billNumber: billNumber ?? existing?.billNumber,
        proposerType,
        status: nextStatus,
        sourceUrl: existing?.sourceUrl ?? pageUrl,
        updatedAt: nowIso(),
      }
      const result = upsert(bills, bill)
      bills = result.collection
      if (result.changed) updated += 1

      // 参議院明細側で正確な日付のイベントを持つ場合は暫定イベントを作らない
      const accurateTypes: BillEvent["type"][] = [
        "submitted",
        "committee_referral",
        "passed_lower_house",
        "passed_diet",
      ]
      const eventType = eventTypeByStatus[nextStatus]
      const hasAccurateEvent =
        eventType !== undefined &&
        accurateTypes.includes(eventType) &&
        events.some(
          (event) => event.billId === billId && event.type === eventType
        )
      if ((statusChanged || !existing) && eventType && !hasAccurateEvent) {
        const event: BillEvent = {
          id: `event-${billId}-${nextStatus}-${today}`,
          billId,
          type: eventType,
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
