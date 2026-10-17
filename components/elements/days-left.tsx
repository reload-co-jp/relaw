"use client"

import { FC, useSyncExternalStore } from "react"
import { daysUntil, formatDate, today } from "lib/format"

const URGENT_DAYS = 7

const css = `
.days-left{display:inline-flex;flex-direction:column;gap:.125rem;line-height:1.4}
.days-left-date{color:var(--text-muted);font-size:.75rem}
.days-left-count{color:var(--text);font-weight:700}
.days-left[data-urgent] .days-left-count{color:var(--urgent)}
.days-left-flag{background:var(--urgent-soft);border-radius:var(--radius);color:var(--urgent);font-size:.6875rem;font-weight:700;padding:0 .375rem;width:fit-content}
`

const noop = () => () => {}

/**
 * 期日と残り日数。静的ビルドのため、表示時点の日付 (JST) でクライアント側でも再計算する。
 * label は「締切」「施行」など。
 */
export const DaysLeft: FC<{ date: string; label: string; builtOn: string }> = ({
  date,
  label,
  builtOn,
}) => {
  const current = useSyncExternalStore(noop, today, () => builtOn)
  const days = daysUntil(date, current)
  const urgent = days >= 0 && days <= URGENT_DAYS
  const text =
    days > 0 ? `あと${days}日` : days === 0 ? `本日${label}` : `${label}済み`
  return (
    <>
      <style href="days-left" precedence="component">
        {css}
      </style>
      <span className="days-left" data-urgent={urgent ? "" : undefined}>
        {urgent && (
          <span className="days-left-flag">
            {label === "締切" ? "締切間近" : `まもなく${label}`}
          </span>
        )}
        <span className="days-left-date">
          {label} <time dateTime={date}>{formatDate(date)}</time>
        </span>
        <span className="days-left-count">{text}</span>
      </span>
    </>
  )
}
