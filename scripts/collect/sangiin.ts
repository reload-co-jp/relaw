import type {
  Bill,
  BillEvent,
  BillStatus,
  Document,
  DocumentType,
} from "../../lib/types.ts"
import {
  absoluteUrl,
  fetchText,
  formatBillNumber,
  hashId,
  loadCollection,
  nowIso,
  parseJapaneseDate,
  proposerTypeByGianType,
  saveCollection,
  sleep,
  stripTags,
  upsert,
  type CollectorResult,
  type GianType,
} from "./lib.ts"
import { resolveDietSessions } from "./config.ts"

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
  gianType?: GianType
  submittedSession?: number
  submittedNumber?: number
  proposerName?: string
  submittedAt?: string
  summary?: string
  lowerCommittee: CommitteeProgress
  upperCommittee: CommitteeProgress
  lowerPlenary: PlenaryProgress
  upperPlenary: PlenaryProgress
  passedLowerHouseAt?: string
  passedUpperHouseAt?: string
  rejected: boolean
  continued: boolean
  expired: boolean
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
  // 議案要旨: 「（○○委員会） 件名…要旨」の見出しを除いた本文
  const summary = text
    .match(/議案要旨\s*([\s\S]*?)\s*(?:議案要旨のPDF|議案等のファイル|利用案内|$)/)?.[1]
    ?.replace(/^（[^）]*）\s*/, "")
    .replace(/^[^。]{0,150}?要旨\s+/, "")
    .trim()
  // 「衆議院から受領／提出日」等を除外し、議案そのものの提出日のみ拾う
  const submitted = text.match(/(?:^|[^／])提出日\s*(\S+)/)
  const promulgated = text.match(/公布年月日\s*(\S+)/)
  const lawNumber = text.match(/法律番号\s*(\d+)/)
  const gianType = text.match(/種別\s*\S+（(閣法|衆法|参法)）/)?.[1] as
    | GianType
    | undefined
  const submittedSession = text.match(/提出回次\s*(\d+)\s*回/)?.[1]
  const submittedNumber = text.match(/提出番号\s*(\d+)/)?.[1]
  return {
    gianType,
    submittedSession: submittedSession ? Number(submittedSession) : undefined,
    submittedNumber: submittedNumber ? Number(submittedNumber) : undefined,
    proposerName: text.match(/発議者\s*(.+?)\s*提出者区分/)?.[1]?.trim(),
    submittedAt: submitted ? parseJapaneseDate(submitted[1]) : undefined,
    summary: summary || undefined,
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
    // 会期終了までに議決に至らず審査未了 (廃案) となった場合
    expired: /議決・継続結果\s*(?:審査)?未了/.test(text),
    promulgatedAt: promulgated ? parseJapaneseDate(promulgated[1]) : undefined,
    lawNumber: lawNumber?.[1],
  }
}

/** 明細ページの「議案等のファイル」等から抽出したファイルリンク */
export interface MeisaiFile {
  label: string
  url: string
}

/**
 * 明細ページから議案要旨 PDF と「議案等のファイル」欄のリンクを抽出する。
 * リンク文言は「提出法律案のＰＤＦファイルは、こちらで…」形式のため
 * ファイル種別を表す先頭部分だけをラベルとして残す。
 */
export const parseMeisaiFiles = (
  html: string,
  baseUrl: string
): MeisaiFile[] => {
  const files: MeisaiFile[] = []
  const push = (href: string, text: string) => {
    const label = stripTags(text)
      .replace(/の(?:ＰＤＦ|PDF)ファイル.*$/, "")
      .trim()
    if (!label) return
    const url = absoluteUrl(baseUrl, href)
    if (files.some((file) => file.url === url)) return
    files.push({ label, url })
  }
  const yoshi = html.match(
    /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]*議案要旨の(?:ＰＤＦ|PDF)[^<]*)<\/a>/i
  )
  if (yoshi) push(yoshi[1], yoshi[2])
  const section = html.match(/議案等のファイル<\/th>([\s\S]*?)<\/table>/i)?.[1]
  if (section)
    for (const link of section.matchAll(
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    ))
      push(link[1], link[2])
  return files
}

const docTypeByFileLabel: [RegExp, DocumentType][] = [
  [/議案要旨/, "summary"],
  [/提出法律案|議案本文/, "bill_text"],
  [/成立法律/, "result"],
  [/関連資料|提案理由/, "reason"],
]

const classifyMeisaiFile = (label: string): DocumentType =>
  docTypeByFileLabel.find(([pattern]) => pattern.test(label))?.[1] ?? "other"

/** 委員会の議決・継続結果表記 → BillEventType */
const committeeResultTypes: Record<string, BillEvent["type"]> = {
  可決: "committee_passed",
  修正: "amended",
  否決: "rejected",
  継続: "continued",
  継続審査: "continued",
  未了: "expired",
  審査未了: "expired",
}

const deriveStatus = (info: MeisaiInfo): BillStatus => {
  if (info.rejected) return "rejected"
  if (info.expired) return "expired"
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
  let documents = loadCollection<Document>("documents.json")
  let updated = 0
  const processedSessions = new Set<number>()

  for (const session of await resolveDietSessions()) {
    const pageUrl = `${SANGIIN_BASE}${session}/gian.htm`
    let html: string
    try {
      html = await fetchText(pageUrl)
    } catch (error) {
      errors.push(`session ${session}: ${String(error)}`)
      continue
    }
    processedSessions.add(session)

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
      let files: MeisaiFile[]
      try {
        const meisaiHtml = await fetchText(meisaiUrl)
        info = parseMeisai(meisaiHtml)
        files = parseMeisaiFiles(meisaiHtml, meisaiUrl)
        await sleep(200)
      } catch (error) {
        errors.push(`meisai ${meisaiUrl}: ${String(error)}`)
        continue
      }
      const status =
        info.continued && !info.expired
          ? "committee_review"
          : deriveStatus(info)

      // 継続審査法案は (提出回次, 種別, 提出番号) で回次をまたいで同定する
      const proposerType = info.gianType
        ? proposerTypeByGianType[info.gianType]
        : undefined
      const existing =
        (info.submittedSession && info.submittedNumber && proposerType
          ? bills.find(
              (bill) =>
                bill.submittedSession === info.submittedSession &&
                bill.submittedNumber === info.submittedNumber &&
                bill.proposerType === proposerType
            )
          : undefined) ??
        bills.find(
          (bill) => bill.dietSession === session && bill.title === title
        )
      // より新しい回次で審議済みのエントリを過去回次の古い明細で上書きしない
      if (existing?.dietSession !== undefined && existing.dietSession > session)
        continue
      const billId = existing?.id ?? `bill-${session}-sangiin-${hashId(title)}`

      // 公布・施行済みや審査未了確定からは後退させない
      const statusRank: BillStatus[] = ["promulgated", "enforced", "expired"]
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
          createdAt: nowIso(),
        }),
        dietSession: session,
        submittedSession: info.submittedSession ?? existing?.submittedSession,
        submittedNumber: info.submittedNumber ?? existing?.submittedNumber,
        billNumber:
          info.submittedSession && info.submittedNumber && info.gianType
            ? formatBillNumber(
                info.submittedSession,
                info.gianType,
                info.submittedNumber
              )
            : existing?.billNumber,
        proposerType: proposerType ?? existing?.proposerType,
        proposerName: info.proposerName ?? existing?.proposerName,
        status: nextStatus,
        summary: info.summary ?? existing?.summary,
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

      for (const file of files) {
        const doc: Document = {
          id: `doc-sangiin-${hashId(file.url)}`,
          billId,
          title: file.label,
          type: classifyMeisaiFile(file.label),
          url: file.url,
          format: /\.pdf(\?|$)/i.test(file.url) ? "pdf" : "html",
          source: "参議院",
          createdAt: nowIso(),
        }
        const docResult = upsert(documents, doc)
        documents = docResult.collection
        if (docResult.changed) updated += 1
      }

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

  // 明細に結果が記載されないまま会期が終わり、後続会期の議案一覧にも
  // 現れなかった審議中法案は審査未了 (廃案) とみなす
  const pendingStatuses: BillStatus[] = [
    "submitted",
    "committee_review",
    "passed_lower_house",
    "passed_upper_house",
  ]
  for (const bill of [...bills]) {
    if (bill.dietSession === undefined) continue
    if (!pendingStatuses.includes(bill.status)) continue
    // 後続会期を収集できていない場合は判定しない
    if (!processedSessions.has(bill.dietSession + 1)) continue
    const expiredBill: Bill = {
      ...bill,
      status: "expired",
      updatedAt: nowIso(),
    }
    const result = upsert(bills, expiredBill)
    bills = result.collection
    if (!result.changed) continue
    updated += 1
    const eventResult = upsert(events, {
      id: `event-${bill.id}-expired`,
      billId: bill.id,
      type: "expired",
      date: new Date().toISOString().slice(0, 10),
      description: "会期終了までに議決されず審査未了",
      sourceUrl: bill.sourceUrl,
      createdAt: nowIso(),
    })
    events = eventResult.collection
    if (eventResult.changed) updated += 1
  }

  saveCollection("bills.json", bills)
  saveCollection("bill-events.json", events)
  saveCollection("documents.json", documents)
  return { source: "参議院 議案情報", updated, errors }
}
