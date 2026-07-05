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

/** 委員会等経過 (院ごと) */
interface CommitteeProgress {
  referredAt?: string
  committee?: string
  decidedAt?: string
  result?: string
}

/** 本会議経過 (院ごと) */
interface PlenaryProgress {
  date?: string
  result?: string
  voteMethod?: string
}

/** 明細ページから抽出した審議経過 */
interface MeisaiInfo {
  submittedAt?: string
  lowerCommittee: CommitteeProgress
  upperCommittee: CommitteeProgress
  lowerPlenary: PlenaryProgress
  upperPlenary: PlenaryProgress
  passedLowerHouseAt?: string
  passedUpperHouseAt?: string
  rejected: boolean
  continued: boolean
  promulgatedAt?: string
  lawNumber?: string
}

export const parseMeisai = (html: string): MeisaiInfo => {
  const text = stripTags(html)
  // 「参議院委員会等経過 本付託日 …」のように経過見出しごとの区間を切り出す
  const section = (heading: string): string =>
    text.match(
      new RegExp(
        `${heading}([\\s\\S]*?)(?=(?:衆議院|参議院)(?:委員会等|本会議)経過|その他|議案要旨|$)`
      )
    )?.[1] ?? ""

  const committeeProgress = (
    chamber: "衆議院" | "参議院"
  ): CommitteeProgress => {
    const part = section(`${chamber}委員会等経過`)
    const referred = part.match(/本付託日\s*(\S+)/)
    const decided = part.match(/議決日\s*(\S+)/)
    return {
      referredAt: referred ? parseJapaneseDate(referred[1]) : undefined,
      committee: part.match(/付託委員会等\s*(\S+)/)?.[1],
      decidedAt: decided ? parseJapaneseDate(decided[1]) : undefined,
      result: part.match(/議決・継続結果\s*(\S+)/)?.[1],
    }
  }

  const plenaryProgress = (chamber: "衆議院" | "参議院"): PlenaryProgress => {
    const part = section(`${chamber}本会議経過`)
    const date = part.match(/議決日\s*(\S+)/)
    return {
      date: date ? parseJapaneseDate(date[1]) : undefined,
      result: part.match(/議決 (\S+)/)?.[1],
      voteMethod: part.match(/採決方法\s*(\S+)/)?.[1],
    }
  }

  const lowerCommittee = committeeProgress("衆議院")
  const upperCommittee = committeeProgress("参議院")
  const lowerPlenary = plenaryProgress("衆議院")
  const upperPlenary = plenaryProgress("参議院")
  // 「衆議院から受領／提出日」等を除外し、議案そのものの提出日のみ拾う
  const submitted = text.match(/(?:^|[^／])提出日\s*(\S+)/)
  const promulgated = text.match(/公布年月日\s*(\S+)/)
  const lawNumber = text.match(/法律番号\s*(\d+)/)
  return {
    submittedAt: submitted ? parseJapaneseDate(submitted[1]) : undefined,
    lowerCommittee,
    upperCommittee,
    lowerPlenary,
    upperPlenary,
    passedLowerHouseAt:
      lowerPlenary.result === "可決" ? lowerPlenary.date : undefined,
    passedUpperHouseAt:
      upperPlenary.result === "可決" ? upperPlenary.date : undefined,
    rejected:
      lowerPlenary.result === "否決" || upperPlenary.result === "否決",
    continued: /議決・継続結果\s*継続/.test(text),
    promulgatedAt: promulgated ? parseJapaneseDate(promulgated[1]) : undefined,
    lawNumber: lawNumber?.[1],
  }
}

/** 委員会の議決・継続結果表記 → BillEventType */
const committeeResultTypes: Record<string, BillEvent["type"]> = {
  可決: "committee_passed",
  修正: "amended",
  否決: "rejected",
  継続: "continued",
  継続審査: "continued",
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
        submittedAt: info.submittedAt ?? existing?.submittedAt,
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
      // 収集日を日付とした暫定イベントを、明細ページの正確な日付で置き換える
      const replaceProvisional = (
        type: BillEvent["type"],
        chamber?: "lower" | "upper"
      ) => {
        events = events.filter(
          (event) =>
            event.billId !== billId ||
            event.type !== type ||
            (chamber !== undefined && event.chamber !== chamber) ||
            event.id.startsWith(`event-${billId}-committee-`) ||
            !/\d{4}-\d{2}-\d{2}$/.test(event.id)
        )
      }
      if (info.submittedAt) {
        replaceProvisional("submitted")
        newEvents.push({
          id: `event-${billId}-submitted`,
          billId,
          type: "submitted",
          date: info.submittedAt,
          description: "提出",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      }
      for (const [chamber, chamberName, committee] of [
        ["lower", "衆議院", info.lowerCommittee],
        ["upper", "参議院", info.upperCommittee],
      ] as const) {
        if (committee.referredAt) {
          replaceProvisional("committee_referral", chamber)
          newEvents.push({
            id: `event-${billId}-committee-referral-${chamber}`,
            billId,
            type: "committee_referral",
            date: committee.referredAt,
            chamber,
            description: committee.committee
              ? `${chamberName} ${committee.committee}に付託`
              : `${chamberName} 委員会付託`,
            sourceUrl: meisaiUrl,
            createdAt: nowIso(),
          })
        }
        if (committee.decidedAt && committee.result)
          newEvents.push({
            id: `event-${billId}-committee-decision-${chamber}`,
            billId,
            type: committeeResultTypes[committee.result] ?? "other",
            date: committee.decidedAt,
            chamber,
            description: `${chamberName} ${committee.committee ?? "委員会"}で${committee.result}`,
            sourceUrl: meisaiUrl,
            createdAt: nowIso(),
          })
      }
      if (info.passedLowerHouseAt && info.passedUpperHouseAt) {
        replaceProvisional("passed_diet")
        newEvents.push({
          id: `event-${billId}-passed-diet`,
          billId,
          type: "passed_diet",
          date: [info.passedLowerHouseAt, info.passedUpperHouseAt]
            .sort()
            .at(-1) as string,
          chamber: "both",
          description: "成立",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      }
      if (info.passedLowerHouseAt) {
        replaceProvisional("passed_lower_house")
        newEvents.push({
          id: `event-${billId}-passed-lower`,
          billId,
          type: "passed_lower_house",
          date: info.passedLowerHouseAt,
          chamber: "lower",
          description: info.lowerPlenary.voteMethod
            ? `衆議院本会議で可決 (${info.lowerPlenary.voteMethod})`
            : "衆議院本会議で可決",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      }
      if (info.passedUpperHouseAt) {
        replaceProvisional("passed_upper_house")
        newEvents.push({
          id: `event-${billId}-passed-upper`,
          billId,
          type: "passed_upper_house",
          date: info.passedUpperHouseAt,
          chamber: "upper",
          description: info.upperPlenary.voteMethod
            ? `参議院本会議で可決 (${info.upperPlenary.voteMethod})`
            : "参議院本会議で可決",
          sourceUrl: meisaiUrl,
          createdAt: nowIso(),
        })
      }
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
