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

const readJson = <T>(filename: string): T[] =>
  JSON.parse(
    readFileSync(join(process.cwd(), "data", filename), "utf-8")
  ) as T[]

export const getBills = (): Bill[] =>
  readJson<Bill>("bills.json").sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )

export const getBill = (id: string): Bill | undefined =>
  getBills().find((bill) => bill.id === id)

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

export const getLaws = (): Law[] =>
  readJson<Law>("laws.json").sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  )

export const getLaw = (id: string): Law | undefined =>
  getLaws().find((law) => law.id === id)

export const getLawVersions = (lawId: string): LawVersion[] =>
  readJson<LawVersion>("law-versions.json")
    .filter((version) => version.lawId === lawId)
    .sort((a, b) =>
      (a.promulgatedAt ?? "").localeCompare(b.promulgatedAt ?? "")
    )

export const getLawText = (lawId: string): LawText | undefined => {
  const path = join(process.cwd(), "data", "law-texts", `${lawId}.json`)
  if (!existsSync(path)) return undefined
  return JSON.parse(readFileSync(path, "utf-8")) as LawText
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
