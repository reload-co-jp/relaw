import type { Bill, Document, DocumentType } from "../../lib/types.ts"
import {
  absoluteUrl,
  fetchText,
  hashId,
  loadCollection,
  nowIso,
  saveCollection,
  stripTags,
  upsert,
  type CollectorResult,
} from "./lib.ts"
import { resolveDietSessions } from "./config.ts"

const CAS_BASE = "https://www.cas.go.jp/jp/houan/"

const docTypeByLabel: [RegExp, DocumentType][] = [
  [/新旧対照/, "comparison_table"],
  [/要綱/, "outline"],
  [/概要/, "summary"],
  [/理由/, "reason"],
  [/参照条文/, "reference_provisions"],
  [/本文|法律案/, "bill_text"],
]

const classifyDocument = (label: string): DocumentType =>
  docTypeByLabel.find(([pattern]) => pattern.test(label))?.[1] ?? "raw"

/**
 * 内閣官房の国会提出法案ページを国会回次ごとに巡回し、
 * 法案単位で資料 URL を documents.json に書き出す。
 * 法案名が bills.json に見つからない場合は法案エントリも作成する。
 */
export const collectNaikaku = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  let bills = loadCollection<Bill>("bills.json")
  let documents = loadCollection<Document>("documents.json")
  let updated = 0

  for (const session of await resolveDietSessions()) {
    const pageUrl = `${CAS_BASE}${session}.html`
    let html: string
    try {
      html = await fetchText(pageUrl)
    } catch (error) {
      errors.push(`session ${session}: ${String(error)}`)
      continue
    }

    // 行単位で法案名とその行内の資料リンクを対応付ける
    const rows = html.split(/<tr[\s>]/i).slice(1)
    for (const row of rows) {
      const cells = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (m) => m[1]
      )
      if (cells.length === 0) continue
      const title = stripTags(cells[0] ?? "")
      // ナビゲーション行や見出し行 (「法律案」等の単語のみ) を除外
      if (title.length < 8 || !/法律案|法案/.test(title)) continue

      // 継続審査で dietSession が先の回次に進んでいても提出回次で同定する
      const existing = bills.find(
        (bill) =>
          bill.title === title &&
          (bill.dietSession === session || bill.submittedSession === session)
      )
      const billId = existing?.id ?? `bill-${session}-cas-${hashId(title)}`
      if (!existing) {
        const bill: Bill = {
          id: billId,
          title,
          dietSession: session,
          submittedSession: session,
          proposerType: "cabinet",
          status: "submitted",
          sourceUrl: pageUrl,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        const result = upsert(bills, bill)
        bills = result.collection
        if (result.changed) updated += 1
      }

      for (const link of row.matchAll(
        /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      )) {
        const url = absoluteUrl(pageUrl, link[1])
        // 法案資料 (PDF または houan 配下) 以外のサイト共通リンクを除外
        if (!/\.pdf(\?|$)/i.test(url) && !url.includes("/jp/houan/")) continue
        const label = stripTags(link[2]) || "資料"
        const doc: Document = {
          id: `doc-cas-${hashId(url)}`,
          billId,
          title: label,
          type: classifyDocument(label),
          url,
          format: /\.pdf(\?|$)/i.test(url) ? "pdf" : "html",
          source: "内閣官房",
          createdAt: nowIso(),
        }
        const result = upsert(documents, doc)
        documents = result.collection
        if (result.changed) updated += 1
      }
    }
  }

  saveCollection("bills.json", bills)
  saveCollection("documents.json", documents)
  return { source: "内閣官房 国会提出法案", updated, errors }
}
