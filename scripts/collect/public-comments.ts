import type { Bill, Law, PublicComment } from "../../lib/types.ts"
import {
  fetchText,
  hashId,
  loadCollection,
  nowIso,
  saveCollection,
  upsert,
  type CollectorResult,
} from "./lib.ts"

const RSS_URL = "https://public-comment.e-gov.go.jp/rss/pcm_list.xml"

const decodeEntities = (text: string): string =>
  text
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")

/** 名称の部分一致で法案・法令と紐付ける */
const linkByTitle = (
  title: string,
  bills: Bill[],
  laws: Law[]
): { billId?: string; lawId?: string; relatedLawTitle?: string } => {
  const normalized = title.replace(/\s/g, "")
  const law = laws.find(
    (candidate) =>
      candidate.title.length >= 5 && normalized.includes(candidate.title)
  )
  const bill = bills.find(
    (candidate) =>
      candidate.title.length >= 5 &&
      normalized.includes(
        candidate.title.replace(/の一部を改正する法律案?$/, "")
      )
  )
  return {
    billId: bill?.id,
    lawId: law?.id,
    relatedLawTitle: law?.title,
  }
}

/**
 * e-Gov パブリックコメントの新着 RSS を巡回し、
 * 案件名・省庁・募集期間を public-comments.json に書き出す。
 */
export const collectPublicComments = async (): Promise<CollectorResult> => {
  const bills = loadCollection<Bill>("bills.json")
  const laws = loadCollection<Law>("laws.json")
  let comments = loadCollection<PublicComment>("public-comments.json")
  let updated = 0

  let rss: string
  try {
    rss = await fetchText(RSS_URL)
  } catch (error) {
    return {
      source: "e-Gov パブリックコメント",
      updated: 0,
      errors: [String(error)],
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  for (const item of rss.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)) {
    const field = (tag: string) =>
      item[1]
        .match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))?.[1]
        ?.trim()
    const title = decodeEntities(field("title") ?? "")
    const link = decodeEntities(field("link") ?? "")
    if (!title || !link) continue
    const description = decodeEntities(field("description") ?? "")

    const idMatch = link.match(/id=(\w+)/)
    const id = `pc-${idMatch?.[1] ?? hashId(link)}`

    const toDate = (value?: string) =>
      value?.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
        ? value
            .match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)!
            .slice(1)
            .map((part, index) => (index === 0 ? part : part.padStart(2, "0")))
            .join("-")
        : undefined
    const startAt = toDate(description.match(/案の公示日：([^\n]+)/)?.[1])
    const endAt = toDate(description.match(/受付締切日時：([^\n]+)/)?.[1])
    const ministry = description
      .match(/問合せ先（所管省庁・部局名等）：([^\n]+)/)?.[1]
      ?.match(/^(内閣府|内閣官房|[^\s]{2,8}?(?:省|庁|委員会|院))/)?.[1]

    const isResult = /結果/.test(title)
    const status: PublicComment["status"] = isResult
      ? "result_published"
      : endAt && endAt < today
        ? "closed"
        : "open"

    const comment: PublicComment = {
      id,
      title,
      ministry,
      status,
      startAt,
      endAt,
      sourceUrl: link,
      ...linkByTitle(title, bills, laws),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    const result = upsert(comments, comment)
    comments = result.collection
    if (result.changed) updated += 1
  }

  saveCollection("public-comments.json", comments)
  return { source: "e-Gov パブリックコメント", updated, errors: [] }
}
