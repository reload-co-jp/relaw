import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type {
  Bill,
  Change,
  BillEvent,
  Document,
  Law,
  LawText,
  LawVersion,
  PublicComment,
} from "./types"
import { today } from "./format"

export { today }

// ビルド中にページ数 × ファイル数の読み込みが発生するため、ファイル単位でキャッシュする。
// ponytail: プロセス内キャッシュ。dev で data/ を更新したら再起動が必要
const jsonCache = new Map<string, unknown[]>()

const readJson = <T>(filename: string): T[] => {
  if (!jsonCache.has(filename))
    jsonCache.set(
      filename,
      JSON.parse(readFileSync(join(process.cwd(), "data", filename), "utf-8"))
    )
  return [...(jsonCache.get(filename) as T[])]
}

export const getBills = (): Bill[] =>
  readJson<Bill>("bills.json").sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )

export const getBill = (id: string): Bill | undefined =>
  getBills().find((bill) => bill.id === id)

/** 法案が提出・審議された国会回次 (新しい順) */
export const getSessions = (): number[] =>
  [
    ...new Set(
      getBills().flatMap((bill) =>
        [bill.submittedSession, bill.dietSession].filter(
          (session): session is number => session !== undefined
        )
      )
    ),
  ].sort((a, b) => b - a)

/** 回次に提出された法案と、継続審査でその回次に審議された法案 */
export const getSessionBills = (session: number): Bill[] =>
  getBills().filter(
    (bill) => bill.submittedSession === session || bill.dietSession === session
  )

/** 同日のイベントを手続きの順に並べるための順位 */
const EVENT_ORDER: BillEvent["type"][] = [
  "public_comment_started",
  "public_comment_closed",
  "submitted",
  "committee_referral",
  "committee_passed",
  "amended",
  "passed_lower_house",
  "passed_upper_house",
  "passed_diet",
  "promulgated",
  "enforced",
  "continued",
  "withdrawn",
  "rejected",
  "expired",
  "other",
]

export const getBillEvents = (billId: string): BillEvent[] => {
  const events = readJson<BillEvent>("bill-events.json").filter(
    (event) => event.billId === billId
  )
  const bill = getBill(billId)
  if (bill?.submittedAt && !events.some((event) => event.type === "submitted"))
    events.push({
      id: `event-${billId}-submitted-synthesized`,
      billId,
      type: "submitted",
      date: bill.submittedAt,
      sourceUrl: bill.sourceUrl,
      createdAt: bill.createdAt,
    })
  return events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      EVENT_ORDER.indexOf(a.type) - EVENT_ORDER.indexOf(b.type)
  )
}

export const getLatestBillEvents = (): Map<string, BillEvent> => {
  const latest = new Map<string, BillEvent>()
  for (const event of readJson<BillEvent>("bill-events.json")) {
    const current = latest.get(event.billId)
    if (!current || event.date.localeCompare(current.date) > 0)
      latest.set(event.billId, event)
  }
  return latest
}

/**
 * e-Gov の法令一覧 API は法令単位の施行日を返さないため、
 * 制定時版 (改正法令番号なしの版) の施行日のうち最も早いものを施行日とする。
 * 施行日が未来なら未施行とする。
 */
const withEnforcement = (law: Law, versions: LawVersion[]): Law => {
  const enforcedAt =
    law.enforcedAt ??
    versions
      .filter(
        (version) =>
          version.lawId === law.id &&
          !version.amendmentLawNumber &&
          version.enforcedAt
      )
      .map((version) => version.enforcedAt as string)
      .sort()[0]
  const status =
    law.status === "in_force" && enforcedAt && enforcedAt > today()
      ? "not_yet_enforced"
      : law.status
  return { ...law, enforcedAt, status }
}

export const getLaws = (): Law[] => {
  const versions = readJson<LawVersion>("law-versions.json")
  return readJson<Law>("laws.json")
    .map((law) => withEnforcement(law, versions))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const getLaw = (id: string): Law | undefined =>
  getLaws().find((law) => law.id === id)

export const getAllLawVersions = (): LawVersion[] =>
  readJson<LawVersion>("law-versions.json")

export const getLawVersions = (lawId: string): LawVersion[] =>
  readJson<LawVersion>("law-versions.json")
    .filter((version) => version.lawId === lawId)
    .sort((a, b) =>
      (a.promulgatedAt ?? "").localeCompare(b.promulgatedAt ?? "")
    )

const lawTextCache = new Map<string, LawText | undefined>()

export const getLawText = (lawId: string): LawText | undefined => {
  if (!lawTextCache.has(lawId)) {
    const path = join(process.cwd(), "data", "law-texts", `${lawId}.json`)
    lawTextCache.set(
      lawId,
      existsSync(path)
        ? (JSON.parse(readFileSync(path, "utf-8")) as LawText)
        : undefined
    )
  }
  return lawTextCache.get(lawId)
}

export const getDocuments = (): Document[] =>
  readJson<Document>("documents.json")

export const getBillDocuments = (billId: string): Document[] =>
  getDocuments().filter((doc) => doc.billId === billId)

export const getLawDocuments = (lawId: string): Document[] =>
  getDocuments().filter((doc) => doc.lawId === lawId)

/** 収集時の status は締切後も "open" のまま残るため、締切日 (JST) で再判定する。endAt 当日は募集中 */
const withCommentStatus = (comment: PublicComment): PublicComment =>
  comment.status === "open" && comment.endAt && comment.endAt < today()
    ? { ...comment, status: "closed" }
    : comment

export const getPublicComments = (): PublicComment[] =>
  readJson<PublicComment>("public-comments.json")
    .map(withCommentStatus)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

/** 公布年ごとの法令 (新しい年順) */
export const getLawsByPromulgationYear = (): Map<string, Law[]> => {
  const groups = new Map<string, Law[]>()
  for (const law of getLaws()
    .filter((law) => law.promulgatedAt)
    .sort((a, b) =>
      (b.promulgatedAt ?? "").localeCompare(a.promulgatedAt ?? "")
    )) {
    const year = (law.promulgatedAt as string).slice(0, 4)
    groups.set(year, [...(groups.get(year) ?? []), law])
  }
  return new Map([...groups].sort(([a], [b]) => b.localeCompare(a)))
}

/** 施行済み法令を施行年月 ("2025-04") ごとに (新しい月順) */
export const getLawsByEnforcementMonth = (): Map<string, Law[]> => {
  const groups = new Map<string, Law[]>()
  for (const law of getLaws()
    .filter((law) => law.enforcedAt && law.enforcedAt <= today())
    .sort((a, b) => (b.enforcedAt ?? "").localeCompare(a.enforcedAt ?? ""))) {
    const month = (law.enforcedAt as string).slice(0, 7)
    groups.set(month, [...(groups.get(month) ?? []), law])
  }
  return new Map([...groups].sort(([a], [b]) => b.localeCompare(a)))
}

/** 施行日が未来の法令 (施行日の近い順) */
export const getUpcomingLaws = (): Law[] =>
  getLaws()
    .filter((law) => law.enforcedAt && law.enforcedAt > today())
    .sort((a, b) => (a.enforcedAt ?? "").localeCompare(b.enforcedAt ?? ""))

const NOTABLE_EVENTS: BillEvent["type"][] = [
  "submitted",
  "amended",
  "passed_lower_house",
  "passed_upper_house",
  "passed_diet",
  "promulgated",
  "enforced",
  "continued",
  "withdrawn",
  "rejected",
  "expired",
]

/** 法案の主要な動き (委員会付託などの手続き的なイベントを除く)。日付の新しい順 */
export const getRecentBillEvents = (limit: number): BillEvent[] =>
  readJson<BillEvent>("bill-events.json")
    .filter(
      (event) => NOTABLE_EVENTS.includes(event.type) && event.date <= today()
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.billId.localeCompare(b.billId)
    )
    .slice(0, limit)

/** 収集データの最終更新日時 (各エンティティの updatedAt の最大値) */
export const getDataUpdatedAt = (): string =>
  [
    ...getBills().map((bill) => bill.updatedAt),
    ...getLaws().map((law) => law.updatedAt),
    ...getPublicComments().map((comment) => comment.updatedAt),
  ].reduce((a, b) => (a > b ? a : b), "")

export const getChanges = (entityId: string): Change[] =>
  readJson<Change>("changes.json")
    .filter((change) => change.entityId === entityId)
    .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
