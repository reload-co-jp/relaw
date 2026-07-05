import { FC, Fragment } from "react"
import Link from "next/link"
import type { Bill } from "lib/types"
import { billStatusColors, billStatusLabels } from "lib/labels"
import { Badge } from "components/elements/badge"
import { EmptyMessage } from "components/elements/section"

const meta = (bill: Bill): string[] =>
  [
    bill.billNumber,
    bill.ministry,
    bill.submittedAt && `提出 ${bill.submittedAt}`,
    bill.promulgatedAt && `公布 ${bill.promulgatedAt}`,
  ].filter(Boolean) as string[]

export const BillList: FC<{ bills: Bill[] }> = ({ bills }) => {
  if (bills.length === 0) return <EmptyMessage>該当なし</EmptyMessage>
  return (
    <ul className="card-list">
      {bills.map((bill) => (
        <li key={bill.id} className="card">
          <div className="card-title-row">
            <Badge
              label={billStatusLabels[bill.status]}
              color={billStatusColors[bill.status]}
            />
            <Link href={`/bills/${bill.id}/`} className="card-title">
              {bill.title}
            </Link>
          </div>
          {meta(bill).length > 0 && (
            <p className="card-meta">
              {meta(bill).map((item, index) => (
                <Fragment key={item}>
                  {index > 0 && <span className="card-meta-sep">·</span>}
                  {item}
                </Fragment>
              ))}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
