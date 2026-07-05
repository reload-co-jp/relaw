import type { Bill, BillEvent, BillStatus } from "../../lib/types.ts"
import {
  absoluteUrl,
  fetchText,
  hashId,
  loadCollection,
  nowIso,
  parseJapaneseDate,
  saveCollection,
  sleep,
  stripTags,
  upsert,
  type CollectorResult,
} from "./lib.ts"
import { dietSessions } from "./config.ts"

const SANGIIN_BASE = "https://www.sangiin.go.jp/japanese/joho1/kousei/gian/"

/** 明細ページから抽出した審議経過 */
interface MeisaiInfo {
  passedLowerHouseAt?: string
  passedUpperHouseAt?: string
  rejected: boolean
  continued: boolean
  promulgatedAt?: string
  lawNumber?: string
}

export const parseMeisai = (html: string): MeisaiInfo => {
  const text = stripTags(html)
  const chamberResult = (chamber: "衆議院" | "参議院") => {
    const match = text.match(
      new RegExp(`${chamber}本会議経過\\s*議決日\\s*(\\S+)\\s*議決\\s*(\\S+)`)
    )
    if (!match) return undefined
    return { date: parseJapaneseDate(match[1]), result: match[2] }
  }
  const lower = chamberResult("衆議院")
  const upper = chamberResult("参議院")
  const promulgated = text.match(/公布年月日\s*(\S+)/)
  const lawNumber = text.match(/法律番号\s*(\d+)/)
  return {
    passedLowerHouseAt: lower?.result === "可決" ? lower.date : undefined,
    passedUpperHouseAt: upper?.result === "可決" ? upper.date : undefined,
    rejected: lower?.result === "否決" || upper?.result === "否決",
    continued: /議決・継続結果\s*継続/.test(text),
    promulgatedAt: promulgated ? parseJapaneseDate(promulgated[1]) : undefined,
    lawNumber: lawNumber?.[1],
  }
}

const deriveStatus = (info: MeisaiInfo): BillStatus => {
  if (info.rejected) return "rejected"
  if (info.promulgatedAt) return "promulgated"
  if (info.passedLowerHouseAt && info.passedUpperHouseAt) return "passed_diet"
  if (info.passedUpperHouseAt) return "passed_upper_house"
  if (info.passedLowerHouseAt) return "passed_lower_house"
  return "committee_review"
}

/**
 * 参議院の議案一覧から明細ページを巡回し、両院の議決・公布情報を
 * bills.json に統合、状態変更を bill-events.json に追記する。
 */
export const collectSangiin = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  let bills = loadCollection<Bill>("bills.json")
  let events = loadCollection<BillEvent>("bill-events.json")
  let updated = 0

  for (const session of dietSessions) {
    const pageUrl = `${SANGIIN_BASE}${session}/gian.htm`
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
      if (cells.length < 3) continue
      const title = cells.find(
        (cell) => cell.length >= 8 && /法律案|法案/.test(cell)
      )
      if (!title) continue
      const meisaiHref = row.match(
        /href=["']([^"']*meisai\/[^"']+\.htm)["']/i
      )?.[1]
      if (!meisaiHref) continue

      const meisaiUrl = absoluteUrl(pageUrl, meisaiHref)
      let info: MeisaiInfo
      try {
        info = parseMeisai(await fetchText(meisaiUrl))
        await sleep(200)
      } catch (error) {
        errors.push(`meisai ${meisaiUrl}: ${String(error)}`)
        continue
      }
      const status = info.continued ? "committee_review" : deriveStatus(info)

      const existing = bills.find(
        (bill) => bill.dietSession === session && bill.title === title
      )
      const billId = existing?.id ?? `bill-${session}-sangiin-${hashId(title)}`

      // 官報・e-Gov 側で公布・施行まで進んでいる場合は後退させない
      const statusRank: BillStatus[] = ["promulgated", "enforced"]
      const nextStatus =
        existing &&
        statusRank.includes(existing.status) &&
        !statusRank.includes(status)
          ? existing.status
          : status

      const statusChanged =
        existing !== undefined && existing.status !== nextStatus
      const bill: Bill = {
        ...(existing ?? {
          id: billId,
          title,
          dietSession: session,
          createdAt: nowIso(),
        }),
        status: nextStatus,
        passedLowerHouseAt:
          info.passedLowerHouseAt ?? existing?.passedLowerHouseAt,
        passedUpperHouseAt:
          info.passedUpperHouseAt ?? existing?.passedUpperHouseAt,
        enactedAt:
          info.passedLowerHouseAt && info.passedUpperHouseAt
            ? [info.passedLowerHouseAt, info.passedUpperHouseAt].sort().at(-1)
            : existing?.enactedAt,
        promulgatedAt: info.promulgatedAt ?? existing?.promulgatedAt,
        sourceUrl: meisaiUrl,
        updatedAt: nowIso(),
      }
      const result = upsert(bills, bill)
      bills = result.collection
      if (result.changed) updated += 1

      const newEvents: BillEvent[] = []
      if (info.passedLowerHouseAt)
        newEvents.push({
          id: `event-${billId}-passed-lower`,
          billId,
          type: "passed_lower_house",
          date: info.passedLowerHouseAt,
          chamber: "lower",
          description: "衆議院本会議で可決",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      if (info.passedUpperHouseAt)
        newEvents.push({
          id: `event-${billId}-passed-upper`,
          billId,
          type: "passed_upper_house",
          date: info.passedUpperHouseAt,
          chamber: "upper",
          description: "参議院本会議で可決",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      if (info.promulgatedAt)
        newEvents.push({
          id: `event-${billId}-promulgated`,
          billId,
          type: "promulgated",
          date: info.promulgatedAt,
          description: info.lawNumber
            ? `公布 (法律番号 ${info.lawNumber})`
            : "公布",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      if (statusChanged && status === "rejected")
        newEvents.push({
          id: `event-${billId}-rejected`,
          billId,
          type: "rejected",
          date: new Date().toISOString().slice(0, 10),
          description: "否決",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      for (const event of newEvents) {
        const eventResult = upsert(events, event)
        events = eventResult.collection
        if (eventResult.changed) updated += 1
      }
    }
  }

  saveCollection("bills.json", bills)
  saveCollection("bill-events.json", events)
  return { source: "参議院 議案情報", updated, errors }
}
