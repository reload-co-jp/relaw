import { FC } from "react"
import type { Bill, BillEvent } from "lib/types"
import { getLatestBillEvents } from "lib/data"
import {
  billEventTypeLabels,
  billStages,
  billStageIndex,
  billStatusColors,
  billStatusLabels,
  proposerTypeLabels,
} from "lib/labels"
import { Entry, EntryList } from "components/blocks/entry-list"

export const billEntry = (bill: Bill, latestEvent?: BillEvent): Entry => {
  const stageIndex = billStageIndex[bill.status]
  return {
  id: bill.id,
  title: bill.title,
  href: `/bills/${bill.id}/`,
  badges: [
    {
      label: billStatusLabels[bill.status],
      color: billStatusColors[bill.status],
    },
  ],
  stage:
    stageIndex !== undefined
      ? { steps: billStages, current: stageIndex }
      : undefined,
  summary: bill.summary,
  meta: [
    bill.billNumber,
    bill.proposerName ??
      (bill.proposerType && proposerTypeLabels[bill.proposerType]),
    bill.ministry,
    bill.submittedAt && `提出 ${bill.submittedAt}`,
    bill.promulgatedAt && `公布 ${bill.promulgatedAt}`,
    latestEvent &&
      !["submitted", "promulgated"].includes(latestEvent.type) &&
      `${billEventTypeLabels[latestEvent.type]} ${latestEvent.date}`,
  ].filter(Boolean) as string[],
  }
}

export const BillList: FC<{ bills: Bill[] }> = ({ bills }) => {
  const latestEvents = getLatestBillEvents()
  return (
    <EntryList
      entries={bills.map((bill) => billEntry(bill, latestEvents.get(bill.id)))}
    />
  )
}
