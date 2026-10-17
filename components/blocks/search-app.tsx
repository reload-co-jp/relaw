"use client"

import { FC, FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import {
  billStatusColors,
  billStatusLabels,
  lawStatusColors,
  lawStatusLabels,
  publicCommentStatusColors,
  publicCommentStatusLabels,
  searchEntryKindColors,
} from "lib/labels"
import { formatDate } from "lib/format"
import {
  DateField,
  dateFieldLabels,
  filterEntries,
  kindLabels,
  PAGE_SIZE,
  parseQuery,
  SearchEntry,
  SearchKind,
  SearchQuery,
  searchHref,
  SortOrder,
  sortLabels,
  statusGroups,
  toSearchParams,
} from "lib/search"
import type { Theme } from "lib/themes"
import { Entry, EntryList } from "components/blocks/entry-list"
import { DaysLeft } from "components/elements/days-left"

const css = `
.search-form{background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-lg);display:grid;gap:1rem;margin:0 0 1.25rem;padding:1rem 1.25rem}
.search-q{display:flex;gap:.5rem}
.search-q input{flex:1;min-width:0}
.search-form input,.search-form select{background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius);color:var(--text);font-size:.9375rem;min-height:2.5rem;padding:.375rem .625rem;width:100%}
.search-form button{background:var(--accent);border:0;border-radius:var(--radius);color:#fff;cursor:pointer;font-size:.875rem;font-weight:600;padding:0 1.125rem}
.search-filters{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr))}
.search-filters label,.search-dates legend{color:var(--text-muted);display:grid;font-size:.75rem;gap:.25rem}
.search-dates{border:0;display:grid;gap:.5rem;grid-column:1/-1;grid-template-columns:repeat(auto-fill,minmax(12rem,1fr));margin:0;padding:0}
.search-dates legend{margin:0 0 .25rem;padding:0}
.search-status{align-items:baseline;display:flex;flex-wrap:wrap;gap:.25rem 1rem;margin:0 0 .75rem}
.search-count{font-size:1rem;font-weight:700}
.search-sort{color:var(--text-muted);font-size:.8125rem}
.search-chips{align-items:center;display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;margin:0 0 1rem;padding:0}
.search-chip{align-items:center;background:var(--accent-soft);border:1px solid var(--accent-line);border-radius:999px;color:var(--accent-strong);cursor:pointer;display:inline-flex;font-size:.8125rem;gap:.375rem;padding:.125rem .75rem}
.search-chip span{font-weight:700}
.search-clear{background:none;border:0;color:var(--text-muted);cursor:pointer;font-size:.8125rem;text-decoration:underline}
.search-empty{background:var(--surface);border:1px dashed var(--line-strong);border-radius:var(--radius-lg);padding:1.25rem}
.search-empty ul{margin:.5rem 0 0;padding-left:1.25rem}
.search-pages{align-items:center;display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;list-style:none;margin:1.5rem 0 0;padding:0}
.search-pages a,.search-pages span{border:1px solid var(--line);border-radius:var(--radius);display:inline-block;min-width:2.5rem;padding:.25rem .625rem;text-align:center;text-decoration:none}
.search-pages [aria-current]{background:var(--accent);border-color:var(--accent);color:#fff}
.search-message{color:var(--text-muted);padding:1.5rem 0}
`

type IndexState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; entries: SearchEntry[] }

const statusLabel = (entry: SearchEntry): { label: string; color: string } =>
  entry.kind === "bill"
    ? {
        label: billStatusLabels[entry.status as keyof typeof billStatusLabels],
        color: billStatusColors[entry.status as keyof typeof billStatusColors],
      }
    : entry.kind === "law"
      ? {
          label: lawStatusLabels[entry.status as keyof typeof lawStatusLabels],
          color: lawStatusColors[entry.status as keyof typeof lawStatusColors],
        }
      : {
          label:
            publicCommentStatusLabels[
              entry.status as keyof typeof publicCommentStatusLabels
            ],
          color:
            publicCommentStatusColors[
              entry.status as keyof typeof publicCommentStatusColors
            ],
        }

const kindColor = (kind: SearchKind): string =>
  searchEntryKindColors[kind === "pc" ? "publicComment" : kind]

const toEntry = (entry: SearchEntry, builtOn: string): Entry => ({
  id: entry.id,
  title: entry.title,
  href: entry.external ? undefined : entry.href,
  externalUrl: entry.external ? entry.href : undefined,
  badges: [
    { label: kindLabels[entry.kind], color: kindColor(entry.kind) },
    statusLabel(entry),
  ],
  summary: entry.summary,
  meta: [
    entry.ministry,
    ...(Object.keys(entry.dates) as DateField[])
      .filter((field) => field !== "deadline")
      .map(
        (field) =>
          `${dateFieldLabels[field]} ${formatDate(entry.dates[field] as string)}`
      ),
  ].filter(Boolean) as string[],
  aside:
    entry.kind === "pc" && entry.dates.deadline ? (
      <DaysLeft date={entry.dates.deadline} label="締切" builtOn={builtOn} />
    ) : undefined,
})

/** 適用中の条件 (チップ表示・個別解除用) */
const activeConditions = (
  query: SearchQuery,
  themes: Theme[]
): { key: string; label: string; clear: Partial<SearchQuery> }[] =>
  [
    query.q && { key: "q", label: `キーワード: ${query.q}`, clear: { q: "" } },
    query.type && {
      key: "type",
      label: `種別: ${kindLabels[query.type]}`,
      clear: { type: undefined, status: undefined },
    },
    query.status && {
      key: "status",
      label: `状態: ${statusGroups.find((group) => group.value === query.status)?.label}`,
      clear: { status: undefined },
    },
    query.theme && {
      key: "theme",
      label: `テーマ: ${themes.find((theme) => theme.slug === query.theme)?.name}`,
      clear: { theme: undefined },
    },
    query.ministry && {
      key: "ministry",
      label: `省庁: ${query.ministry}`,
      clear: { ministry: undefined },
    },
    query.date && {
      key: "date",
      label: `${dateFieldLabels[query.date]}: ${query.from ? formatDate(query.from) : "指定なし"} 〜 ${query.to ? formatDate(query.to) : "指定なし"}`,
      clear: { date: undefined, from: undefined, to: undefined },
    },
  ].filter(Boolean) as {
    key: string
    label: string
    clear: Partial<SearchQuery>
  }[]

const DEBOUNCE_MS = 300

export const SearchApp: FC<{
  themes: Theme[]
  ministries: string[]
  builtOn: string
}> = ({ themes, ministries, builtOn }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = useMemo(
    () =>
      parseQuery(new URLSearchParams(searchParams.toString()), {
        themes: themes.map((theme) => theme.slug),
      }),
    [searchParams, themes]
  )
  const [index, setIndex] = useState<IndexState>({ state: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    fetch("/search-index.json")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<SearchEntry[]>
      })
      .then((entries) => active && setIndex({ state: "ready", entries }))
      .catch(() => active && setIndex({ state: "error" }))
    return () => {
      active = false
    }
  }, [attempt])

  // 同一ページ内の条件変更はサーバーへの再取得が不要なため、History API で URL だけ更新する
  // (Next.js は pushState/replaceState を useSearchParams に同期する)
  const navigate = (next: Partial<SearchQuery>, replace = false) => {
    const params = toSearchParams({ ...query, page: 1, ...next })
    const href = params ? `${pathname}?${params}` : pathname
    if (replace) window.history.replaceState(null, "", href)
    else window.history.pushState(null, "", href)
  }

  // キーワード入力は URL と別に保持し、入力が止まってから URL に反映する。
  // 戻る・進むで URL の q が変わった場合は入力欄を URL に合わせる
  const [draft, setDraft] = useState(query.q)
  const [syncedQ, setSyncedQ] = useState(query.q)
  if (query.q !== syncedQ) {
    setSyncedQ(query.q)
    if (query.q !== draft.trim()) setDraft(query.q)
  }
  useEffect(() => {
    if (draft.trim() === query.q) return
    const timer = setTimeout(
      () => navigate({ q: draft.trim() }, true),
      DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.trim() !== query.q) navigate({ q: draft.trim() })
  }

  const results = useMemo(
    () => (index.state === "ready" ? filterEntries(index.entries, query) : []),
    [index, query]
  )
  const pageCount = Math.max(1, Math.ceil(results.length / PAGE_SIZE))
  const page = Math.min(query.page, pageCount)
  const pageResults = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const conditions = activeConditions(query, themes)
  const statusOptions = statusGroups.filter(
    (group) => !query.type || group.kind === query.type
  )

  return (
    <>
      <style href="search-app" precedence="component">
        {css}
      </style>
      <form className="search-form" role="search" onSubmit={onSubmit}>
        <div className="search-q">
          <label htmlFor="search-q" className="visually-hidden">
            キーワード
          </label>
          <input
            id="search-q"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder="法案名・法令名・法令番号・キーワード"
            autoComplete="off"
          />
          <button type="submit">検索</button>
        </div>
        <div className="search-filters">
          <label>
            種別
            <select
              value={query.type ?? ""}
              onChange={(event) => {
                const type = (event.currentTarget.value || undefined) as
                  SearchKind | undefined
                const status = statusGroups.find(
                  (group) => group.value === query.status
                )
                navigate({
                  type,
                  status:
                    !type || status?.kind === type ? query.status : undefined,
                })
              }}
            >
              <option value="">すべて</option>
              {(Object.keys(kindLabels) as SearchKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {kindLabels[kind]}
                </option>
              ))}
            </select>
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
              {(Object.keys(kindLabels) as SearchKind[]).map((kind) => {
                const options = statusOptions.filter(
                  (group) => group.kind === kind
                )
                return options.length === 0 ? null : (
                  <optgroup key={kind} label={kindLabels[kind]}>
                    {options.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
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
            所管・制定機関
            <select
              value={query.ministry ?? ""}
              onChange={(event) =>
                navigate({ ministry: event.currentTarget.value || undefined })
              }
            >
              <option value="">すべて</option>
              {query.ministry && !ministries.includes(query.ministry) && (
                <option value={query.ministry}>{query.ministry}</option>
              )}
              {ministries.map((ministry) => (
                <option key={ministry} value={ministry}>
                  {ministry}
                </option>
              ))}
            </select>
          </label>
          <label>
            並び順
            <select
              value={query.sort}
              onChange={(event) =>
                navigate({ sort: event.currentTarget.value as SortOrder })
              }
            >
              {(Object.keys(sortLabels) as SortOrder[]).map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabels[sort]}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="search-dates">
            <legend>日付で絞り込む（日付が未確定のものは含まれません）</legend>
            <label>
              日付の種類
              <select
                value={query.date ?? ""}
                onChange={(event) =>
                  navigate({
                    date: (event.currentTarget.value || undefined) as
                      DateField | undefined,
                  })
                }
              >
                <option value="">指定なし</option>
                {(Object.keys(dateFieldLabels) as DateField[]).map((field) => (
                  <option key={field} value={field}>
                    {dateFieldLabels[field]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              開始日
              <input
                type="date"
                value={query.from ?? ""}
                disabled={!query.date}
                onChange={(event) =>
                  navigate({ from: event.currentTarget.value || undefined })
                }
              />
            </label>
            <label>
              終了日
              <input
                type="date"
                value={query.to ?? ""}
                disabled={!query.date}
                onChange={(event) =>
                  navigate({ to: event.currentTarget.value || undefined })
                }
              />
            </label>
          </fieldset>
        </div>
      </form>

      {conditions.length > 0 && (
        <ul className="search-chips" aria-label="適用中の条件">
          {conditions.map((condition) => (
            <li key={condition.key}>
              <button
                type="button"
                className="search-chip"
                onClick={() => {
                  if (condition.key === "q") setDraft("")
                  navigate(condition.clear)
                }}
                aria-label={`条件「${condition.label}」を解除`}
              >
                {condition.label}
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setDraft("")
                window.history.pushState(null, "", pathname)
              }}
            >
              条件をすべて解除
            </button>
          </li>
        </ul>
      )}

      <div aria-live="polite">
        {index.state === "loading" && (
          <p className="search-message">検索データを読み込み中…</p>
        )}
        {index.state === "error" && (
          <div className="search-empty" role="alert">
            <p>検索データの取得に失敗しました。通信状況を確認してください。</p>
            <button
              type="button"
              className="search-clear"
              onClick={() => {
                setIndex({ state: "loading" })
                setAttempt((value) => value + 1)
              }}
            >
              再試行
            </button>
          </div>
        )}
        {index.state === "ready" && (
          <p className="search-status">
            <span className="search-count">{results.length} 件</span>
            {results.length > PAGE_SIZE && (
              <span className="search-sort">
                {(page - 1) * PAGE_SIZE + 1}〜
                {Math.min(page * PAGE_SIZE, results.length)} 件目を表示
              </span>
            )}
            <span className="search-sort">
              並び順: {sortLabels[query.sort]}
              {query.sort !== "updated" &&
                `（${query.date ? dateFieldLabels[query.date] : "提出日・公布日・締切日"}。日付未確定は末尾）`}
            </span>
          </p>
        )}
      </div>

      {index.state === "ready" && results.length === 0 && (
        <div className="search-empty">
          <p>条件に一致する法案・法令・パブリックコメントはありません。</p>
          <ul>
            <li>
              キーワードを短くする、別の言い方（例: 正式名称の一部）で試す
            </li>
            {conditions
              .filter((condition) => condition.key !== "q")
              .map((condition) => (
                <li key={condition.key}>
                  <Link
                    href={searchHref({ ...query, ...condition.clear, page: 1 })}
                    className="text-link"
                  >
                    「{condition.label}」を外して検索
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}

      {index.state === "ready" && results.length > 0 && (
        <EntryList
          entries={pageResults.map((entry) => toEntry(entry, builtOn))}
        />
      )}

      {index.state === "ready" && pageCount > 1 && (
        <nav aria-label="検索結果のページ">
          <ul className="search-pages">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map(
              (number) => (
                <li key={number}>
                  {number === page ? (
                    <span aria-current="page">{number}</span>
                  ) : (
                    <Link href={searchHref({ ...query, page: number })} scroll>
                      {number}
                    </Link>
                  )}
                </li>
              )
            )}
          </ul>
        </nav>
      )}
    </>
  )
}
