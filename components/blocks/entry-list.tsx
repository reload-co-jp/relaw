import { FC, Fragment } from "react"
import Link from "next/link"
import { Badge } from "components/elements/badge"
import { EmptyMessage } from "components/elements/section"

export interface EntryBadge {
  label: string
  color?: string
}

export interface EntryLink {
  label: string
  href: string
  external?: boolean
}

export interface Entry {
  id: string
  title: string
  href?: string
  externalUrl?: string
  badges: EntryBadge[]
  meta: string[]
  links?: EntryLink[]
}

const EntryTitle: FC<{ entry: Entry }> = ({ entry }) => {
  if (entry.href)
    return (
      <Link href={entry.href} className="card-title">
        {entry.title}
      </Link>
    )
  if (entry.externalUrl)
    return (
      <a
        href={entry.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="card-title"
      >
        {entry.title}
      </a>
    )
  return <span className="card-title">{entry.title}</span>
}

export const EntryList: FC<{ entries: Entry[] }> = ({ entries }) => {
  if (entries.length === 0) return <EmptyMessage>該当なし</EmptyMessage>
  return (
    <ul className="card-list">
      {entries.map((entry) => (
        <li key={entry.id} className="card">
          <div className="card-title-row">
            {entry.badges.map((badge) => (
              <Badge key={badge.label} label={badge.label} color={badge.color} />
            ))}
            <EntryTitle entry={entry} />
          </div>
          {entry.meta.length > 0 && (
            <p className="card-meta">
              {entry.meta.map((item, index) => (
                <Fragment key={item}>
                  {index > 0 && <span className="card-meta-sep">·</span>}
                  {item}
                </Fragment>
              ))}
            </p>
          )}
          {entry.links && entry.links.length > 0 && (
            <p className="card-meta">
              {entry.links.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                    style={{ marginRight: "1.25rem" }}
                  >
                    {link.label} ↗
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-link"
                    style={{ marginRight: "1.25rem" }}
                  >
                    {link.label}
                  </Link>
                )
              )}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
