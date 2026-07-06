import type { Bill, Document } from "../../lib/types.ts"
import {
  fetchJson,
  hashId,
  loadCollection,
  nowIso,
  saveCollection,
  sleep,
  upsert,
  type CollectorResult,
} from "./lib.ts"

const KOKKAI_API = "https://kokkai.ndl.go.jp/api/meeting_list"

/** 1 法案あたりに取得する会議録の上限 */
const MAX_RECORDS_PER_BILL = 10

interface MeetingRecord {
  issueID: string
  session: number
  nameOfHouse: string
  nameOfMeeting: string
  issue: string
  date: string
  meetingURL: string
}

interface MeetingListResponse {
  numberOfRecords: number
  meetingRecord?: MeetingRecord[]
}

const deliberatingStatuses: Bill["status"][] = [
  "submitted",
  "committee_review",
  "passed_lower_house",
  "passed_upper_house",
]

/**
 * 国会会議録検索システム API を法案名で検索し、審議が行われた
 * 本会議・委員会の会議録リンクを documents.json に書き出す。
 * 対象は国会で審議中の法案のみ (収集済みの会議録は保持される)。
 */
export const collectKokkai = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  const bills = loadCollection<Bill>("bills.json")
  let documents = loadCollection<Document>("documents.json")
  let updated = 0

  const targets = bills.filter((bill) =>
    deliberatingStatuses.includes(bill.status)
  )
  for (const bill of targets) {
    const params = new URLSearchParams({
      any: bill.title,
      recordPacking: "json",
      maximumRecords: String(MAX_RECORDS_PER_BILL),
    })
    if (bill.submittedAt) params.set("from", bill.submittedAt)
    let response: MeetingListResponse
    try {
      response = await fetchJson<MeetingListResponse>(
        `${KOKKAI_API}?${params}`
      )
      await sleep(500)
    } catch (error) {
      errors.push(`${bill.title}: ${String(error)}`)
      continue
    }

    for (const meeting of response.meetingRecord ?? []) {
      if (!meeting.meetingURL) continue
      const doc: Document = {
        id: `doc-kokkai-${hashId(`${bill.id}-${meeting.issueID}`)}`,
        billId: bill.id,
        title: `第${meeting.session}回国会 ${meeting.nameOfHouse} ${meeting.nameOfMeeting} ${meeting.issue} (${meeting.date})`,
        type: "minutes",
        url: meeting.meetingURL,
        format: "html",
        source: "国会会議録検索システム",
        publishedAt: meeting.date,
        createdAt: nowIso(),
      }
      const result = upsert(documents, doc)
      documents = result.collection
      if (result.changed) updated += 1
    }
  }

  saveCollection("documents.json", documents)
  return { source: "国会会議録検索システム", updated, errors }
}
