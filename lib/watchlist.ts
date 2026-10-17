/**
 * ウォッチリスト。認証・サーバー保存がないため、このブラウザの localStorage にのみ保存する
 * (端末・ブラウザ間で同期されない)。id は法案・法令 ID / テーマ slug で一意。
 */
export interface WatchItem {
  id: string
  kind: "bill" | "law" | "theme"
  title: string
  href: string
  addedAt?: string
}

const KEY = "relaw:watchlist:v1"
const EVENT = "relaw:watchlist"

/** 保存値をそのまま返す (useSyncExternalStore の snapshot は同一値で安定させる) */
export const readRaw = (): string => {
  try {
    return localStorage.getItem(KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

/** 壊れた保存値や想定外の形は捨てる */
export const parseItems = (raw: string): WatchItem[] => {
  try {
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value)
      ? value.filter(
          (item): item is WatchItem =>
            typeof item?.id === "string" &&
            ["bill", "law", "theme"].includes(item?.kind) &&
            typeof item?.title === "string" &&
            typeof item?.href === "string" &&
            item.href.startsWith("/")
        )
      : []
  } catch {
    return []
  }
}

const write = (items: WatchItem[]): boolean => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
    window.dispatchEvent(new Event(EVENT))
    return true
  } catch {
    return false
  }
}

export const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener("storage", callback)
  window.addEventListener(EVENT, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(EVENT, callback)
  }
}

export const toggle = (item: WatchItem): boolean => {
  const items = parseItems(readRaw())
  return write(
    items.some((saved) => saved.id === item.id)
      ? items.filter((saved) => saved.id !== item.id)
      : [...items, { ...item, addedAt: new Date().toISOString() }]
  )
}

export const remove = (id: string): boolean =>
  write(parseItems(readRaw()).filter((item) => item.id !== id))
