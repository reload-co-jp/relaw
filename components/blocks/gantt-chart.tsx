"use client"

import { FC, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { billStatusColors, billStatusLabels } from "lib/labels"
import { formatDate, today } from "lib/format"
import { markersOf, Phase, segmentsOf } from "lib/gantt"
import type { BillMilestones } from "lib/lifecycle"
import {
  filterEntries,
  parseQuery,
  SearchEntry,
  SearchQuery,
  statusGroups,
  toSearchParams,
} from "lib/search"
import type { Theme } from "lib/themes"
import type { Bill } from "lib/types"
import { Badge } from "components/elements/badge"
import { EmptyMessage } from "components/elements/section"

export interface GanttRow {
  entry: SearchEntry
  status: Bill["status"]
  terminated: boolean
  milestones: BillMilestones
}

// dataviz validate_palette.js (light, categorical 3 slots): 全 PASS。
// 緑系 (#1baf7a) は面とのコントラスト 2.74:1 のため、凡例の文字ラベル・ツールチップ・時系列リストで補う
export const PHASE_COLORS: Record<Phase, string> = {
  deliberation: "#eb6834",
  toPromulgation: "#1baf7a",
  toEnforcement: "#2a78d6",
  terminated: "#8a8f98",
}

const PHASE_LABELS: Record<Phase, string> = {
  deliberation: "審議中（提出 → 成立）",
  toPromulgation: "成立 → 公布",
  toEnforcement: "公布 → 施行",
  terminated: "廃案・撤回・否決まで",
}

const RANGES = {
  "6m": { label: "直近6か月", months: 6 },
  "1y": { label: "直近1年", months: 12 },
  "2y": { label: "直近2年", months: 24 },
  all: { label: "全期間", months: undefined },
} as const
type Range = keyof typeof RANGES

const css = `
.gc-controls{align-items:end;display:flex;flex-wrap:wrap;gap:.75rem 1rem;margin:0 0 1rem}
.gc-controls label{color:var(--text-muted);display:grid;font-size:.75rem;gap:.25rem}
.gc-controls input,.gc-controls select{background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius);color:var(--text);font-size:.875rem;min-height:2.25rem;padding:.25rem .5rem}
.gc-views{display:inline-flex}
.gc-views button{background:var(--surface);border:1px solid var(--line-strong);color:var(--text);cursor:pointer;font-size:.8125rem;min-height:2.25rem;padding:0 .875rem}
.gc-views button:first-child{border-radius:var(--radius) 0 0 var(--radius)}
.gc-views button:last-child{border-left:0;border-radius:0 var(--radius) var(--radius) 0}
.gc-views button[aria-pressed=true]{background:var(--accent);border-color:var(--accent);color:#fff}
.gc-summary{color:var(--text-muted);font-size:.8125rem;margin:0 0 .75rem}
.gc-legend{display:flex;flex-wrap:wrap;gap:.375rem 1.25rem;margin:0 0 .75rem}
.gc-legend span{align-items:center;color:var(--text-muted);display:inline-flex;font-size:.75rem;gap:.375rem}
.gc-swatch{border-radius:2px;display:inline-block;height:.625rem;width:1.25rem}
.gc-swatch[data-uncertain]{background:repeating-linear-gradient(135deg,var(--tone-neutral) 0 3px,transparent 3px 6px)!important;border:1px solid var(--tone-neutral)}
.gc-scroll{border:1px solid var(--line);border-radius:var(--radius-lg);overflow-x:auto;overscroll-behavior-x:contain}
.gc{background:var(--surface);display:grid;grid-template-columns:minmax(9rem,16rem) minmax(44rem,1fr);min-width:fit-content}
.gc-name{background:var(--surface);border-bottom:1px solid var(--line);border-right:1px solid var(--line);font-size:.75rem;left:0;line-height:1.4;overflow:hidden;padding:.375rem .625rem;position:sticky;z-index:2}
.gc-name a{color:var(--text);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-decoration:none}
.gc-name a:hover{color:var(--accent);text-decoration:underline}
.gc-name small{color:var(--text-faint);display:block}
.gc-head{background:var(--surface);border-bottom:1px solid var(--line-strong);height:2rem;position:relative}
.gc-tick{color:var(--text-faint);font-size:.6875rem;position:absolute;top:.5rem;transform:translateX(-50%);white-space:nowrap}
.gc-track{border-bottom:1px solid var(--line);min-height:3rem;position:relative}
.gc-track[data-selected],.gc-name[data-selected]{background:var(--accent-soft)}
.gc-grid{border-left:1px dashed var(--line);bottom:0;position:absolute;top:0}
.gc-today{border-left:2px solid var(--urgent);bottom:0;position:absolute;top:0;z-index:1}
.gc-seg{border-radius:4px;height:.75rem;position:absolute;top:50%;transform:translateY(-50%)}
.gc-seg[data-uncertain]{background:repeating-linear-gradient(135deg,var(--c) 0 3px,transparent 3px 6px)!important;border:1px dashed var(--c)}
.gc-mark{background:var(--surface);border:2px solid var(--text);border-radius:50%;cursor:pointer;height:1.5rem;padding:0;position:absolute;top:50%;transform:translate(-50%,-50%) scale(.5);width:1.5rem;z-index:1}
.gc-mark:hover,.gc-mark:focus-visible{transform:translate(-50%,-50%) scale(.75)}
.gc-detail{background:var(--surface);border:1px solid var(--accent-line);border-radius:var(--radius-lg);margin:1rem 0 0;padding:1rem 1.25rem}
.gc-detail h3{font-size:1rem;margin:.375rem 0 .5rem}
.gc-detail ul{margin:0;padding-left:1.25rem}
.gc-detail-close{background:none;border:0;color:var(--text-muted);cursor:pointer;float:right;font-size:.8125rem;text-decoration:underline}
.gc-list{border-top:1px solid var(--line);list-style:none;margin:0;padding:0}
.gc-list li{border-bottom:1px solid var(--line);display:grid;gap:.125rem 1rem;grid-template-columns:8rem 6rem minmax(0,1fr);padding:.5rem .25rem}
.gc-list time{color:var(--text-muted);font-size:.8125rem}
.gc-list b{font-size:.8125rem}
.gc-mobile-hint{display:none}
@media (max-width:40rem){.gc{grid-template-columns:8rem minmax(36rem,1fr)}.gc-mobile-hint{color:var(--text-muted);display:block;font-size:.75rem;margin:0 0 .5rem}.gc-list li{grid-template-columns:1fr}}
`

const DAY_MS = 24 * 60 * 60 * 1000
const noop = () => () => {}

const shiftMonths = (date: string, months: number): string => {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCMonth(value.getUTCMonth() - months)
  return value.toISOString().slice(0, 10)
}

const monthTicks = (start: number, end: number) => {
  const ticks: { time: number; label: string; year: boolean }[] = []
  const cursor = new Date(start)
  cursor.setUTCDate(1)
  if (cursor.getTime() < start) cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  while (cursor.getTime() <= end) {
    const january = cursor.getUTCMonth() === 0
    ticks.push({
      time: cursor.getTime(),
      label: january
        ? `${cursor.getUTCFullYear()}年1月`
        : `${cursor.getUTCMonth() + 1}月`,
      year: january,
    })
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  return ticks
}

export const GanttChart: FC<{
  rows: GanttRow[]
  themes: Theme[]
  builtOn: string
}> = ({ rows, themes, builtOn }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = useSyncExternalStore(noop, today, () => builtOn)
  const params = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams]
  )
  // 絞り込みは検索ページと同じ解釈 (lib/search) を使う。並びは提出日の新しい順
  const query: SearchQuery = {
    ...parseQuery(params, { themes: themes.map((theme) => theme.slug) }),
    type: "bill",
    sort: "date-desc",
    page: 1,
  }
  const range: Range =
    (Object.keys(RANGES) as Range[]).find(
      (key) => key === params.get("range")
    ) ?? "all"
  const view = params.get("view") === "list" ? "list" : "chart"
  const [selected, setSelected] = useState<string>()

  const navigate = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(
      toSearchParams({ ...query, type: undefined, sort: undefined })
    )
    const extra = { range, view, ...next }
    if (extra.range && extra.range !== "all") merged.set("range", extra.range)
    if (extra.view === "list") merged.set("view", "list")
    for (const key of ["q", "status", "theme"])
      if (key in next) {
        if (next[key]) merged.set(key, next[key] as string)
        else merged.delete(key)
      }
    const search = merged.toString()
    window.history.pushState(
      null,
      "",
      search ? `${pathname}?${search}` : pathname
    )
  }

  const byId = useMemo(
    () => new Map(rows.map((row) => [row.entry.id, row])),
    [rows]
  )
  const visible = filterEntries(
    rows.map((row) => row.entry),
    query
  ).map((entry) => byId.get(entry.id) as GanttRow)

  const windowStart =
    RANGES[range].months === undefined
      ? undefined
      : shiftMonths(current, RANGES[range].months)
  const plotted = visible
    .map((row) => ({
      row,
      segments: segmentsOf(row.milestones, row.terminated, current),
      markers: markersOf(row.milestones),
    }))
    .filter(
      ({ segments, markers }) =>
        segments.length + markers.length > 0 &&
        (!windowStart ||
          [
            ...segments.map((segment) => segment.to),
            ...markers.map((m) => m.date),
          ].some((date) => date >= windowStart))
    )

  const dates = plotted.flatMap(({ segments, markers }) => [
    ...segments.flatMap((segment) => [segment.from, segment.to]),
    ...markers.map((marker) => marker.date),
  ])
  const minDate =
    windowStart ?? dates.reduce((a, b) => (a < b ? a : b), current)
  const maxDate = dates.reduce((a, b) => (a > b ? a : b), current)
  const start = Date.parse(minDate)
  const end = Math.max(Date.parse(maxDate), start + DAY_MS) + 7 * DAY_MS
  const position = (date: string) =>
    Math.min(
      Math.max(((Date.parse(date) - start) / (end - start)) * 100, 0),
      100
    )
  const ticks = monthTicks(start, end)
  const labelStep = Math.ceil(ticks.length / 12)

  const selectedRow = selected ? byId.get(selected) : undefined
  const events = plotted
    .flatMap(({ row, markers }) =>
      markers.map((marker) => ({ ...marker, row }))
    )
    .filter((event) => !windowStart || event.date >= windowStart)
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <style href="gantt-chart" precedence="component">
        {css}
      </style>
      <div className="gc-controls">
        <label>
          法案名
          <input
            type="search"
            defaultValue={query.q}
            key={query.q}
            placeholder="キーワード"
            onKeyDown={(event) => {
              if (event.key === "Enter")
                navigate({ q: event.currentTarget.value.trim() || undefined })
            }}
            onBlur={(event) => {
              if (event.currentTarget.value.trim() !== query.q)
                navigate({ q: event.currentTarget.value.trim() || undefined })
            }}
          />
        </label>
        <label>
          状態
          <select
            value={query.status ?? ""}
            onChange={(event) =>
              navigate({ status: event.currentTarget.value || undefined })
            }
          >
            <option value="">すべて</option>
            {statusGroups
              .filter((group) => group.kind === "bill")
              .map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          テーマ
          <select
            value={query.theme ?? ""}
            onChange={(event) =>
              navigate({ theme: event.currentTarget.value || undefined })
            }
          >
            <option value="">すべて</option>
            {themes.map((theme) => (
              <option key={theme.slug} value={theme.slug}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          表示期間
          <select
            value={range}
            onChange={(event) => navigate({ range: event.currentTarget.value })}
          >
            {(Object.keys(RANGES) as Range[]).map((key) => (
              <option key={key} value={key}>
                {RANGES[key].label}
              </option>
            ))}
          </select>
        </label>
        <div className="gc-views" role="group" aria-label="表示形式">
          <button
            type="button"
            aria-pressed={view === "chart"}
            onClick={() => navigate({ view: "chart" })}
          >
            チャート
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => navigate({ view: "list" })}
          >
            時系列リスト
          </button>
        </div>
      </div>
      <p className="gc-summary" aria-live="polite">
        {plotted.length} 件の法案（提出日の新しい順）
        {windowStart && `・${formatDate(windowStart)}以降に動きのあるもの`}
      </p>

      {plotted.length === 0 ? (
        <EmptyMessage>
          条件に一致する法案はありません。条件を変更してください。
        </EmptyMessage>
      ) : view === "list" ? (
        <ol className="gc-list" aria-label="法案の手続きの時系列（新しい順）">
          {events.map((event) => (
            <li key={`${event.row.entry.id}-${event.label}-${event.date}`}>
              <time dateTime={event.date}>{formatDate(event.date)}</time>
              <b>{event.label}</b>
              <Link href={event.row.entry.href} className="text-link">
                {event.row.entry.title}
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <div className="gc-legend">
            {(Object.keys(PHASE_COLORS) as Phase[]).map((phase) => (
              <span key={phase}>
                <i
                  className="gc-swatch"
                  style={{ background: PHASE_COLORS[phase] }}
                />
                {PHASE_LABELS[phase]}
              </span>
            ))}
            <span>
              <i className="gc-swatch" data-uncertain="" />
              終わりの日付が未確認（今日・最終記録日まで表示）
            </span>
            <span>
              <i
                className="gc-swatch"
                style={{ background: "var(--urgent)", width: "2px" }}
              />
              今日
            </span>
            <span>○ 提出・成立・公布・施行などの記録日（押すと詳細）</span>
          </div>
          <p className="gc-mobile-hint">
            横にスクロールできます。一覧で見る場合は「時系列リスト」を選んでください。
          </p>
          <div className="gc-scroll">
            <div className="gc" role="table" aria-label="法案ガントチャート">
              <div className="gc-name" role="columnheader">
                法案
              </div>
              <div className="gc-head" role="columnheader" aria-label="日付">
                {ticks.map(
                  (tick, index) =>
                    (tick.year || index % labelStep === 0) && (
                      <span
                        key={tick.time}
                        className="gc-tick"
                        style={{
                          left: `${((tick.time - start) / (end - start)) * 100}%`,
                        }}
                      >
                        {tick.label}
                      </span>
                    )
                )}
              </div>
              {plotted.map(({ row, segments, markers }) => {
                const isSelected = row.entry.id === selected
                return (
                  <div
                    key={row.entry.id}
                    role="row"
                    style={{ display: "contents" }}
                  >
                    <div
                      className="gc-name"
                      role="rowheader"
                      data-selected={isSelected ? "" : undefined}
                    >
                      <Link href={row.entry.href}>{row.entry.title}</Link>
                      <small>{billStatusLabels[row.status]}</small>
                    </div>
                    <div
                      className="gc-track"
                      role="cell"
                      data-selected={isSelected ? "" : undefined}
                    >
                      {ticks.map((tick) => (
                        <span
                          key={tick.time}
                          className="gc-grid"
                          style={{
                            left: `${((tick.time - start) / (end - start)) * 100}%`,
                          }}
                        />
                      ))}
                      <span
                        className="gc-today"
                        style={{ left: `${position(current)}%` }}
                      />
                      {segments.map((segment) => (
                        <span
                          key={segment.phase + segment.from}
                          className="gc-seg"
                          data-uncertain={segment.uncertain ? "" : undefined}
                          style={
                            {
                              "--c": PHASE_COLORS[segment.phase],
                              background: PHASE_COLORS[segment.phase],
                              left: `${position(segment.from)}%`,
                              width: `${Math.max(position(segment.to) - position(segment.from), 0.3)}%`,
                            } as React.CSSProperties
                          }
                        />
                      ))}
                      {markers
                        .filter(
                          (marker) => !windowStart || marker.date >= windowStart
                        )
                        .map((marker) => (
                          <button
                            key={marker.label + marker.date}
                            type="button"
                            className="gc-mark"
                            style={{ left: `${position(marker.date)}%` }}
                            aria-label={`${row.entry.title} ${marker.label} ${formatDate(marker.date)}（詳細を表示）`}
                            title={`${marker.label} ${formatDate(marker.date)}`}
                            onClick={() => setSelected(row.entry.id)}
                          />
                        ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {selectedRow && (
        <section
          className="gc-detail"
          aria-live="polite"
          aria-label="選択中の法案"
        >
          <button
            type="button"
            className="gc-detail-close"
            onClick={() => setSelected(undefined)}
          >
            閉じる
          </button>
          <Badge
            label={billStatusLabels[selectedRow.status]}
            color={billStatusColors[selectedRow.status]}
          />
          <h3>
            <Link href={selectedRow.entry.href} className="text-link">
              {selectedRow.entry.title}
            </Link>
          </h3>
          <ul>
            {markersOf(selectedRow.milestones).map((marker) => (
              <li key={marker.label + marker.date}>
                {marker.label}: {formatDate(marker.date)}
              </li>
            ))}
            {selectedRow.milestones.promulgated &&
              selectedRow.milestones.enforcements.length === 0 && (
                <li>
                  施行: 未確認（公的データ上で施行日を確認できていません）
                </li>
              )}
          </ul>
        </section>
      )}
    </>
  )
}
