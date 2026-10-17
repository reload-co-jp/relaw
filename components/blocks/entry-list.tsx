import { FC, Fragment, ReactNode } from "react"
import Link from "next/link"
import { Badge } from "components/elements/badge"
import { EmptyMessage } from "components/elements/section"
import { Stage, StageProgress } from "components/elements/stage-progress"

export interface EntryBadge {
  label: string
  color?: string
  title?: string
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
  summary?: string
  links?: EntryLink[]
  stage?: Stage
  /** 右端に置く強調情報 (期限・施行までの日数など) */
  aside?: ReactNode
}

const css = `
.entry-list{border-top:1px solid var(--line);list-style:none;margin:0;padding:0}
.entry{border-bottom:1px solid var(--line);display:grid;gap:.25rem 1.25rem;grid-template-columns:minmax(0,1fr) auto;padding:.875rem .5rem;position:relative;transition:background .2s}
.entry:hover{background:var(--surface-hover)}
.entry-badges{align-items:center;display:flex;flex-wrap:wrap;gap:.375rem .5rem;margin:0 0 .3rem}
.entry-title{color:var(--text);font-size:.9375rem;font-weight:600;line-height:1.6;overflow-wrap:anywhere;text-decoration:none}
a.entry-title:hover{color:var(--accent);text-decoration:underline}
a.entry-title::after{content:"";inset:0;position:absolute}
.entry-summary{-webkit-box-orient:vertical;color:var(--text-muted);display:-webkit-box;font-size:.8125rem;-webkit-line-clamp:2;line-height:1.7;margin:.375rem 0 0;overflow:hidden}
.entry-meta{color:var(--text-faint);font-size:.75rem;letter-spacing:.03em;margin:.375rem 0 0}
.entry-meta-sep{color:var(--line-strong);margin:0 .5rem}
.entry-links{display:flex;flex-wrap:wrap;gap:.25rem 1.25rem}
.entry-links a{position:relative;z-index:1}
.entry-aside{align-self:center;font-size:.8125rem;text-align:right}
@media (max-width:40rem){.entry{grid-template-columns:minmax(0,1fr)}.entry-aside{text-align:left}}
`

const EntryTitle: FC<{ entry: Entry }> = ({ entry }) => {
  if (entry.href)
    return (
      <Link href={entry.href} className="entry-title">
        {entry.title}
      </Link>
    )
  if (entry.externalUrl)
    return (
      <a
        href={entry.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="entry-title"
      >
        {entry.title}
        <span className="visually-hidden">（外部サイト）</span>
      </a>
    )
  return <span className="entry-title">{entry.title}</span>
}

export const EntryList: FC<{ entries: Entry[]; empty?: ReactNode }> = ({
  entries,
  empty = "該当なし",
}) => (
  <>
    <style href="entry-list" precedence="component">
      {css}
    </style>
    {entries.length === 0 ? (
      <EmptyMessage>{empty}</EmptyMessage>
    ) : (
      <ul className="entry-list">
        {entries.map((entry) => (
          <li key={entry.id} className="entry">
            <div>
              {(entry.badges.length > 0 || entry.stage) && (
                <div className="entry-badges">
                  {entry.badges.map((badge) => (
                    <Badge
                      key={badge.label}
                      label={badge.label}
                      color={badge.color}
                      title={badge.title}
                    />
                  ))}
                  {entry.stage && <StageProgress {...entry.stage} />}
                </div>
              )}
              <EntryTitle entry={entry} />
              {entry.summary && (
                <p className="entry-summary">{entry.summary}</p>
              )}
              {entry.meta.length > 0 && (
                <p className="entry-meta">
                  {entry.meta.map((item, index) => (
                    <Fragment key={item}>
                      {index > 0 && (
                        <span className="entry-meta-sep" aria-hidden="true">
                          ·
                        </span>
                      )}
                      {item}
                    </Fragment>
                  ))}
                </p>
              )}
              {entry.links && entry.links.length > 0 && (
                <p className="entry-meta entry-links">
                  {entry.links.map((link) =>
                    link.external ? (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                      >
                        {link.label} ↗
                      </a>
                    ) : (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="text-link"
                      >
                        {link.label}
                      </Link>
                    )
                  )}
                </p>
              )}
            </div>
            {entry.aside && <div className="entry-aside">{entry.aside}</div>}
          </li>
        ))}
      </ul>
    )}
  </>
)
