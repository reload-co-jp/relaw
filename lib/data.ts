import { readFileSync } from "node:fs"
import { join } from "node:path"
import type {
  Bill,
  BillEvent,
  Document,
  Law,
  LawVersion,
  PublicComment,
} from "./types"

const readJson = <T>(filename: string): T[] =>
  JSON.parse(
    readFileSync(join(process.cwd(), "data", filename), "utf-8")
  ) as T[]

export const getBills = (): Bill[] =>
  readJson<Bill>("bills.json").sort((a, b) =>
    (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt)
  )

export const getBill = (id: string): Bill | undefined =>
  getBills().find((bill) => bill.id === id)

export const getBillEvents = (billId: string): BillEvent[] =>
  readJson<BillEvent>("bill-events.json")
    .filter((event) => event.billId === billId)
    .sort((a, b) => a.date.localeCompare(b.date))

export const getLaws = (): Law[] =>
  readJson<Law>("laws.json").sort((a, b) =>
    (b.promulgatedAt ?? b.createdAt).localeCompare(
      a.promulgatedAt ?? a.createdAt
    )
  )

export const getLaw = (id: string): Law | undefined =>
  getLaws().find((law) => law.id === id)

export const getLawVersions = (lawId: string): LawVersion[] =>
  readJson<LawVersion>("law-versions.json")
    .filter((version) => version.lawId === lawId)
    .sort((a, b) =>
      (a.promulgatedAt ?? "").localeCompare(b.promulgatedAt ?? "")
    )

export const getDocuments = (): Document[] =>
  readJson<Document>("documents.json")

export const getBillDocuments = (billId: string): Document[] =>
  getDocuments().filter((doc) => doc.billId === billId)

export const getLawDocuments = (lawId: string): Document[] =>
  getDocuments().filter((doc) => doc.lawId === lawId)

export const getPublicComments = (): PublicComment[] =>
  readJson<PublicComment>("public-comments.json").sort((a, b) =>
    (b.startAt ?? b.createdAt).localeCompare(a.startAt ?? a.createdAt)
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
