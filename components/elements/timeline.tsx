import { FC } from "react"
import { formatDate } from "lib/format"
import type { TimelineItem } from "lib/lifecycle"
import { EmptyMessage } from "components/elements/section"

const css = `
.tl{list-style:none;margin:0;padding:0}
.tl-item{display:grid;gap:0 1rem;grid-template-columns:7.5rem 1.25rem minmax(0,1fr);position:relative}
.tl-item::before{background:var(--line-strong);bottom:0;content:"";left:calc(7.5rem + 1rem + .625rem - 1px);position:absolute;top:0;width:2px}
.tl-item:first-child::before{top:.9rem}
.tl-item:last-child::before{bottom:calc(100% - .9rem)}
.tl-date{color:var(--text-muted);font-size:.8125rem;padding:.45rem 0;text-align:right;white-space:nowrap}
.tl-dot{background:var(--surface);border:2px solid var(--line-strong);border-radius:50%;height:.875rem;margin:.6rem auto 0;position:relative;width:.875rem;z-index:1}
.tl-item[data-state=done] .tl-dot{background:var(--accent);border-color:var(--accent)}
.tl-item[data-state=scheduled] .tl-dot{border-color:var(--accent)}
.tl-item[data-state=unknown] .tl-dot{border-style:dashed}
.tl-item[data-current] .tl-dot{box-shadow:0 0 0 4px var(--accent-soft)}
.tl-body{padding:.35rem 0 1rem}
.tl-label{font-weight:700}
.tl-tag{border:1px solid currentColor;border-radius:var(--radius);font-size:.6875rem;font-weight:700;margin-left:.5rem;padding:0 .375rem}
.tl-item[data-current] .tl-tag{color:var(--accent)}
.tl-item[data-state=scheduled] .tl-tag{color:var(--tone-progress)}
.tl-item[data-state=unknown] .tl-tag,.tl-item[data-state=unknown] .tl-date{color:var(--text-faint)}
.tl-note,.tl-desc,.tl-source{color:var(--text-muted);font-size:.8125rem;margin:.125rem 0 0}
.tl-desc{color:var(--text-faint)}
@media (max-width:40rem){.tl-item{grid-template-columns:1.25rem minmax(0,1fr)}.tl-item::before{left:calc(.625rem - 1px)}.tl-date{grid-column:2;order:-1;padding:.35rem 0 0;text-align:left}.tl-dot{grid-row:1/3}.tl-body{grid-column:2;padding-top:0}}
`

const stateTags: Record<TimelineItem["state"], string | undefined> = {
  done: undefined,
  scheduled: "予定（確定）",
  unknown: "日付未確認",
}

/** 経過のタイムライン。完了・現在・確定した予定・日付未確認を区別して表示する */
export const Timeline: FC<{ items: TimelineItem[] }> = ({ items }) => {
  if (items.length === 0) return <EmptyMessage>記録された経過なし</EmptyMessage>
  const currentKey = items.filter((item) => item.state === "done").at(-1)?.key
  return (
    <>
      <style href="timeline" precedence="component">
        {css}
      </style>
      <ol className="tl">
        {items.map((item) => {
          const current = item.key === currentKey
          const tag = current ? "現在" : stateTags[item.state]
          return (
            <li
              key={item.key}
              className="tl-item"
              data-state={item.state}
              data-current={current ? "" : undefined}
            >
              <span className="tl-date">
                {item.date ? (
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                ) : (
                  "日付未確認"
                )}
              </span>
              <span className="tl-dot" aria-hidden="true" />
              <div className="tl-body">
                <span className="tl-label">{item.label}</span>
                {tag && <span className="tl-tag">{tag}</span>}
                {item.note && <p className="tl-note">{item.note}</p>}
                {item.description && (
                  <p className="tl-desc">{item.description}</p>
                )}
                {item.source && (
                  <p className="tl-source">
                    出典:{" "}
                    {item.source.url ? (
                      <a
                        href={item.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link"
                      >
                        {item.source.name} ↗
                      </a>
                    ) : (
                      item.source.name
                    )}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
