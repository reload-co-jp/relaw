import type { Document } from "../../lib/types.ts"
import {
  absoluteUrl,
  fetchText,
  hashId,
  loadCollection,
  nowIso,
  saveCollection,
  sleep,
  stripTags,
  upsert,
  type CollectorResult,
} from "./lib.ts"

const KANPO_BASE = "https://www.kanpo.go.jp/"

/** 直近何日分の官報目次を巡回するか */
const RECENT_ISSUES = 7

/** 「防衛省設置法等の一部を改正する法律（五三）」等の公布掲載を表す件名 */
const promulgationPattern = /^(.+?(?:法律|政令|省令|勅令|規則))（[^）]*）/

/**
 * 官報の日次目次 (fullcontents) を巡回し、法律・政令・省令の公布掲載を
 * documents.json に raw エントリとして残す。
 */
export const collectKanpo = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  let documents = loadCollection<Document>("documents.json")
  let updated = 0

  let topHtml: string
  try {
    topHtml = await fetchText(KANPO_BASE)
  } catch (error) {
    return { source: "官報", updated: 0, errors: [String(error)] }
  }

  // トップページから日次目次ページ (YYYYMMDD.fullcontents.html) を探す
  const issueDates = [
    ...new Set(
      [
        ...topHtml.matchAll(
          /href=["'][^"']*?(\d{8})\.fullcontents\.html["']/gi
        ),
      ].map((match) => match[1])
    ),
  ]
    .sort()
    .reverse()
    .slice(0, RECENT_ISSUES)

  for (const date of issueDates) {
    const contentsUrl = `${KANPO_BASE}${date}/${date}.fullcontents.html`
    let html: string
    try {
      html = await fetchText(contentsUrl)
    } catch (error) {
      errors.push(`${date}: ${String(error)}`)
      continue
    }
    const publishedAt = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`

    for (const match of html.matchAll(
      /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    )) {
      const label = stripTags(match[2])
      const title = label.match(promulgationPattern)?.[0]
      if (!title) continue
      const url = absoluteUrl(contentsUrl, match[1])
      const doc: Document = {
        id: `doc-kanpo-${hashId(url)}`,
        title,
        type: "kanpo",
        url,
        format: /\.pdf(\?|$)/i.test(url) ? "pdf" : "html",
        source: "官報",
        publishedAt,
        createdAt: nowIso(),
      }
      const result = upsert(documents, doc)
      documents = result.collection
      if (result.changed) updated += 1
    }
    await sleep(300)
  }

  saveCollection("documents.json", documents)
  return { source: "官報", updated, errors }
}
