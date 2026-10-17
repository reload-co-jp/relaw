"use client"

import { FC, useSyncExternalStore } from "react"
import {
  parseItems,
  readRaw,
  subscribe,
  toggle,
  WatchItem,
} from "lib/watchlist"

const css = `
.watch{align-items:center;background:var(--surface);border:1px solid var(--line-strong);border-radius:999px;color:var(--text);cursor:pointer;display:inline-flex;font-size:.75rem;font-weight:600;gap:.375rem;padding:.125rem .75rem}
.watch[aria-pressed=true]{background:var(--accent-soft);border-color:var(--accent);color:var(--accent-strong)}
.watch:disabled{cursor:default;opacity:.6}
`

/** ウォッチリストへの登録・解除 (このブラウザに保存) */
export const WatchButton: FC<{ item: Omit<WatchItem, "addedAt"> }> = ({
  item,
}) => {
  // サーバー描画時は未登録として出し、クライアントで保存状態を反映する
  const raw = useSyncExternalStore(subscribe, readRaw, () => null)
  const watched =
    raw !== null && parseItems(raw).some((saved) => saved.id === item.id)
  return (
    <>
      <style href="watch-button" precedence="component">
        {css}
      </style>
      <button
        type="button"
        className="watch"
        aria-pressed={watched}
        disabled={raw === null}
        onClick={() => toggle(item)}
        title="このブラウザのウォッチリストに保存します（端末間で同期されません）"
      >
        <span aria-hidden="true">{watched ? "★" : "☆"}</span>
        {watched ? "ウォッチ中" : "ウォッチする"}
      </button>
    </>
  )
}
