import { FC, Fragment } from "react"
import Link from "next/link"
import type { Law } from "lib/types"
import {
  lawStatusColors,
  lawStatusLabels,
  lawTypeColor,
  lawTypeLabels,
} from "lib/labels"
import { Badge } from "components/elements/badge"
import { EmptyMessage } from "components/elements/section"

const meta = (law: Law): string[] =>
  [
    law.lawNumber,
    law.promulgatedAt && `公布 ${law.promulgatedAt}`,
    law.enforcedAt && `施行 ${law.enforcedAt}`,
  ].filter(Boolean) as string[]

export const LawList: FC<{ laws: Law[] }> = ({ laws }) => {
  if (laws.length === 0) return <EmptyMessage>該当なし</EmptyMessage>
  return (
    <ul className="card-list">
      {laws.map((law) => (
        <li key={law.id} className="card">
          <div className="card-title-row">
            <Badge label={lawTypeLabels[law.lawType]} color={lawTypeColor} />
            <Badge
              label={lawStatusLabels[law.status]}
              color={lawStatusColors[law.status]}
            />
            <Link href={`/laws/${law.id}/`} className="card-title">
              {law.title}
            </Link>
          </div>
          {meta(law).length > 0 && (
            <p className="card-meta">
              {meta(law).map((item, index) => (
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
