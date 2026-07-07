import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { createHash } from "node:crypto"

export const DATA_DIR = join(process.cwd(), "data")

// fetch のヘッダは ByteString 制約のため ASCII のみ
export const USER_AGENT = "RelawBot/1.0 (+https://github.com/kixixixixi/relaw)"

export const nowIso = (): string => new Date().toISOString()

/** URL やタイトルから衝突しない短い ID 断片を作る */
export const hashId = (text: string): string =>
  createHash("sha256").update(text).digest("hex").slice(0, 16)

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const fetchText = async (url: string, retries = 2): Promise<string> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
      const buffer = await response.arrayBuffer()
      const contentType = response.headers.get("content-type") ?? ""
      const charsetMatch = contentType.match(/charset=([^;]+)/i)
      const head = new TextDecoder("utf-8", { fatal: false }).decode(
        buffer.slice(0, 2048)
      )
      const metaMatch = head.match(/charset=["']?([\w-]+)/i)
      const charset = (charsetMatch?.[1] ?? metaMatch?.[1] ?? "utf-8")
        .trim()
        .toLowerCase()
      return new TextDecoder(charset === "x-sjis" ? "shift_jis" : charset, {
        fatal: false,
      }).decode(buffer)
    } catch (error) {
      if (attempt >= retries) throw error
      await sleep(1000 * (attempt + 1))
    }
  }
}

export const fetchJson = async <T>(url: string, retries = 2): Promise<T> => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
      return (await response.json()) as T
    } catch (error) {
      if (attempt >= retries) throw error
      await sleep(1000 * (attempt + 1))
    }
  }
}

export const loadCollection = <T>(filename: string): T[] => {
  const path = join(DATA_DIR, filename)
  if (!existsSync(path)) return []
  return JSON.parse(readFileSync(path, "utf-8")) as T[]
}

export const saveCollection = <T extends { id: string }>(
  filename: string,
  items: T[]
): void => {
  const path = join(DATA_DIR, filename)
  mkdirSync(dirname(path), { recursive: true })
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id))
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`)
}

/**
 * id で突合して upsert する。既存エントリは createdAt を保持し、
 * 内容に変化があるときだけ updatedAt を進める。
 */
export const upsert = <
  T extends { id: string; createdAt: string; updatedAt?: string },
>(
  collection: T[],
  incoming: T
): { collection: T[]; changed: boolean } => {
  const index = collection.findIndex((item) => item.id === incoming.id)
  if (index < 0) return { collection: [...collection, incoming], changed: true }
  const existing = collection[index]
  const merged = {
    ...existing,
    ...incoming,
    createdAt: existing.createdAt,
    updatedAt: existing.updatedAt,
  }
  const comparable = (item: T) =>
    JSON.stringify({ ...item, createdAt: "", updatedAt: "" })
  if (comparable(merged) === comparable(existing)) {
    return { collection, changed: false }
  }
  merged.updatedAt = incoming.updatedAt ?? nowIso()
  const next = [...collection]
  next[index] = merged
  return { collection: next, changed: true }
}

export const stripTags = (html: string): string =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()

export const absoluteUrl = (base: string, href: string): string =>
  new URL(href, base).toString()

/** 議案種別 (閣法/衆法/参法) → 提出者区分 */
export const proposerTypeByGianType = {
  閣法: "cabinet",
  衆法: "representative",
  参法: "councillor",
} as const

export type GianType = keyof typeof proposerTypeByGianType

/** 「第217回国会 衆法第25号」形式の議案番号表記 */
export const formatBillNumber = (
  submittedSession: number,
  gianType: GianType,
  submittedNumber: number
): string => `第${submittedSession}回国会 ${gianType}第${submittedNumber}号`

const KANJI_DIGITS: Record<string, number> = {
  〇: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  十: 10,
}

const kanjiToNumber = (text: string): number => {
  if (/^\d+$/.test(text)) return Number(text)
  let result = 0
  let current = 0
  for (const char of text) {
    const digit = KANJI_DIGITS[char]
    if (digit === undefined) return NaN
    if (digit === 10) {
      result += (current || 1) * 10
      current = 0
    } else {
      current = digit
    }
  }
  return result + current
}

/** 「令和8年7月5日」「令和八年七月五日」等の和暦を YYYY-MM-DD に変換 */
export const parseJapaneseDate = (text: string): string | undefined => {
  const match = text.match(
    /(令和|平成|昭和)\s*([\d〇一二三四五六七八九十元]+)年\s*([\d〇一二三四五六七八九十]+)月\s*([\d〇一二三四五六七八九十]+)日/
  )
  if (!match) return undefined
  const eraBase = { 令和: 2018, 平成: 1988, 昭和: 1925 }[match[1]]
  if (!eraBase) return undefined
  const year = match[2] === "元" ? 1 : kanjiToNumber(match[2])
  const month = kanjiToNumber(match[3])
  const day = kanjiToNumber(match[4])
  if (!year || !month || !day) return undefined
  return `${eraBase + year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export interface CollectorResult {
  source: string
  updated: number
  errors: string[]
}
