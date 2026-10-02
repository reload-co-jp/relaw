import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type {
  Bill,
  BillEvent,
  Document,
  Law,
  LawText,
  LawVersion,
  PublicComment,
} from "./types"

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

export const today = (): string => new Date().toISOString().slice(0, 10)

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
  return events.sort((a, b) => a.date.localeCompare(b.date))
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

export const getPublicComments = (): PublicComment[] =>
  readJson<PublicComment>("public-comments.json").sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )

const DASHBOARD_WINDOW_DAYS = 30

const daysFromToday = (date: string): number =>
  Math.floor((Date.parse(date) - Date.now()) / (24 * 60 * 60 * 1000))

export const getRecentlySubmittedBills = (): Bill[] =>
  getBills().filter(
    (bill) =>
      bill.submittedAt &&
      daysFromToday(bill.submittedAt) >= -DASHBOARD_WINDOW_DAYS
  )

export const getBillsUnderDeliberation = (): Bill[] =>
  getBills().filter((bill) =>
    [
      "submitted",
      "committee_review",
      "passed_lower_house",
      "passed_upper_house",
    ].includes(bill.status)
  )

export const getEnactedBills = (): Bill[] =>
  getBills().filter((bill) =>
    ["passed_diet", "promulgated", "enforced"].includes(bill.status)
  )

export const getOpenPublicComments = (): PublicComment[] =>
  getPublicComments().filter((comment) => comment.status === "open")

export const getRecentlyPromulgatedLaws = (): Law[] =>
  getLaws().filter(
    (law) =>
      law.promulgatedAt &&
      daysFromToday(law.promulgatedAt) >= -DASHBOARD_WINDOW_DAYS * 3
  )

export const getUpcomingEnforcementLaws = (): Law[] =>
  getLaws()
    .filter(
      (law) =>
        law.enforcedAt &&
        daysFromToday(law.enforcedAt) >= 0 &&
        daysFromToday(law.enforcedAt) <= DASHBOARD_WINDOW_DAYS * 2
    )
    .sort((a, b) => (a.enforcedAt ?? "").localeCompare(b.enforcedAt ?? ""))

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
