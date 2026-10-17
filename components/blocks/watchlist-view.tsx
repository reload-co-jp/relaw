"use client"

import { FC, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import {
  parseItems,
  readRaw,
  remove,
  subscribe,
  WatchItem,
} from "lib/watchlist"
import type { SearchEntry } from "lib/search"
import { billStatusLabels, lawStatusLabels } from "lib/labels"
import { EmptyMessage } from "components/elements/section"

const css = `
.watch-list{border-top:1px solid var(--line);list-style:none;margin:0 0 2rem;padding:0}
.watch-list li{align-items:center;border-bottom:1px solid var(--line);display:flex;gap:1rem;justify-content:space-between;padding:.75rem .25rem}
.watch-list .entry-meta{color:var(--text-faint);font-size:.75rem;margin:.25rem 0 0}
.watch-remove{background:none;border:1px solid var(--line-strong);border-radius:var(--radius);color:var(--text-muted);cursor:pointer;flex:none;font-size:.75rem;padding:.25rem .625rem}
`

const kindTitles: Record<WatchItem["kind"], string> = {
  bill: "法案",
  law: "法令",
  theme: "テーマ",
}

/** 登録項目の現在のステータスは検索インデックスから引く (取得できなくても一覧は表示する) */
export const WatchlistView: FC = () => {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  const items = useMemo(() => (raw === null ? [] : parseItems(raw)), [raw])
  const [entries, setEntries] = useState<Map<string, SearchEntry>>()
  useEffect(() => {
    fetch("/search-index.json")
      .then((response) => (response.ok ? response.json() : []))
      .then((list: SearchEntry[]) =>
        setEntries(new Map(list.map((entry) => [entry.id, entry])))
      )
      .catch(() => setEntries(new Map()))
  }, [])

  const status = (item: WatchItem): string | undefined => {
    const entry = entries?.get(item.id)
    if (!entry) return undefined
    return entry.kind === "bill"
      ? billStatusLabels[entry.status as keyof typeof billStatusLabels]
      : lawStatusLabels[entry.status as keyof typeof lawStatusLabels]
  }

  if (raw === null) return <p>読み込み中…</p>
  return (
    <>
      <style href="watchlist-view" precedence="component">
        {css}
      </style>
      {items.length === 0 && (
        <EmptyMessage>
          まだ登録がありません。法案・法令・テーマのページにある「ウォッチする」ボタンで登録できます。
        </EmptyMessage>
      )}
      {(Object.keys(kindTitles) as WatchItem["kind"][]).map((kind) => {
        const group = items.filter((item) => item.kind === kind)
        if (group.length === 0) return null
        return (
          <section key={kind}>
            <h2 className="related-heading">
              {kindTitles[kind]}（{group.length} 件）
            </h2>
            <ul className="watch-list">
              {group.map((item) => (
                <li key={item.id}>
                  <div>
                    <Link href={item.href} className="text-link">
                      {item.title}
                    </Link>
                    {kind !== "theme" && (
                      <p className="entry-meta">
                        現在のステータス:{" "}
                        {entries === undefined
                          ? "確認中…"
                          : (status(item) ??
                            "確認できません（データから削除された可能性があります）")}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="watch-remove"
                    onClick={() => remove(item.id)}
                    aria-label={`「${item.title}」をウォッチリストから外す`}
                  >
                    解除
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </>
  )
}
