import { FC } from "react"
import type { Bill } from "lib/types"
import {
  billStatusColors,
  billStatusLabels,
  proposerTypeLabels,
} from "lib/labels"
import { Entry, EntryList } from "components/blocks/entry-list"

export const billEntry = (bill: Bill): Entry => ({
  id: bill.id,
  title: bill.title,
  href: `/bills/${bill.id}/`,
  badges: [
    {
      label: billStatusLabels[bill.status],
      color: billStatusColors[bill.status],
    },
  ],
  meta: [
    bill.billNumber,
    bill.proposerName ??
      (bill.proposerType && proposerTypeLabels[bill.proposerType]),
    bill.ministry,
    bill.submittedAt && `提出 ${bill.submittedAt}`,
    bill.promulgatedAt && `公布 ${bill.promulgatedAt}`,
  ].filter(Boolean) as string[],
})

export const BillList: FC<{ bills: Bill[] }> = ({ bills }) => (
  <EntryList entries={bills.map(billEntry)} />
)
