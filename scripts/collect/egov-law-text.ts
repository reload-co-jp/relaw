import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Law, LawText, LawTextBlock, LawVersion } from "../../lib/types.ts"
import {
  DATA_DIR,
  fetchJson,
  loadCollection,
  nowIso,
  sleep,
  type CollectorResult,
} from "./lib.ts"
import { lawTextFetchLimit } from "./config.ts"

const API_BASE = "https://laws.e-gov.go.jp/api/2"

/** 法令標準 XML を JSON 化したノード */
interface XmlNode {
  tag: string
  attr?: Record<string, string>
  children?: (XmlNode | string)[]
}

interface EgovLawDataResponse {
  revision_info?: { law_revision_id?: string }
  law_full_text?: XmlNode
}

// 表・様式・図は本文テキストとして扱えないため除外
const SKIP_TAGS = new Set([
  "TOC",
  "LawNum",
  "LawTitle",
  "TableStruct",
  "Appdx",
  "AppdxTable",
  "AppdxStyle",
  "AppdxFig",
  "AppdxNote",
  "AppdxFormat",
  "Fig",
  "SupplProvisionAppdx",
  "SupplProvisionAppdxTable",
  "SupplProvisionAppdxStyle",
])

const HEADING_TAGS: Record<string, { titleTag: string; level: number }> = {
  Part: { titleTag: "PartTitle", level: 1 },
  Chapter: { titleTag: "ChapterTitle", level: 2 },
  Section: { titleTag: "SectionTitle", level: 3 },
  Subsection: { titleTag: "SubsectionTitle", level: 4 },
  Division: { titleTag: "DivisionTitle", level: 5 },
}

// Item / Subitem は同じ構造 (XxxTitle + XxxSentence) の入れ子
const ITEM_TAGS = new Set([
  "Item",
  ...Array.from({ length: 10 }, (_, i) => `Subitem${i + 1}`),
])

const textOf = (node: XmlNode | string): string => {
  if (typeof node === "string") return node
  if (node.tag === "Rt") return "" // ルビの読みは除外
  const inner = (node.children ?? []).map(textOf).join("")
  // 号の中の複数欄は全角空白で区切る
  return node.tag === "Column" ? `${inner}\u3000` : inner
}

const childText = (node: XmlNode, tag: string): string => {
  const child = (node.children ?? []).find(
    (c): c is XmlNode => typeof c !== "string" && c.tag === tag
  )
  return child ? textOf(child).trim() : ""
}

const pushItem = (node: XmlNode, blocks: LawTextBlock[], level: number) => {
  const title = childText(node, `${node.tag}Title`)
  const sentence = childText(node, `${node.tag}Sentence`)
  const text = [title, sentence].filter(Boolean).join("\u3000")
  if (text) blocks.push({ type: "item", level, text })
  for (const child of node.children ?? []) {
    if (typeof child === "string") continue
    if (ITEM_TAGS.has(child.tag)) pushItem(child, blocks, level + 1)
  }
}

const pushParagraph = (
  node: XmlNode,
  blocks: LawTextBlock[],
  articleTitle?: string
) => {
  const caption = childText(node, "ParagraphCaption")
  if (caption) blocks.push({ type: "caption", text: caption })
  const num = childText(node, "ParagraphNum")
  const sentence = childText(node, "ParagraphSentence")
  const prefix = articleTitle || num
  const text = prefix ? `${prefix}\u3000${sentence}` : sentence
  if (text) blocks.push({ type: "paragraph", text })
  for (const child of node.children ?? []) {
    if (typeof child === "string") continue
    if (ITEM_TAGS.has(child.tag)) pushItem(child, blocks, 1)
  }
}

const pushArticle = (node: XmlNode, blocks: LawTextBlock[]) => {
  const caption = childText(node, "ArticleCaption")
  if (caption) blocks.push({ type: "caption", text: caption })
  const title = childText(node, "ArticleTitle")
  let first = true
  for (const child of node.children ?? []) {
    if (typeof child === "string") continue
    if (child.tag !== "Paragraph") continue
    pushParagraph(child, blocks, first ? title : undefined)
    first = false
  }
}

const walk = (node: XmlNode | string, blocks: LawTextBlock[]) => {
  if (typeof node === "string") return
  if (SKIP_TAGS.has(node.tag)) return

  const heading = HEADING_TAGS[node.tag]
  if (heading) {
    const title = childText(node, heading.titleTag)
    if (title) blocks.push({ type: "heading", level: heading.level, text: title })
    for (const child of node.children ?? []) walk(child, blocks)
    return
  }

  switch (node.tag) {
    case "EnactStatement":
      blocks.push({ type: "paragraph", text: textOf(node).trim() })
      return
    case "SupplProvision": {
      const label = childText(node, "SupplProvisionLabel") || "附則"
      const amendLawNum = node.attr?.AmendLawNum
      blocks.push({
        type: "heading",
        level: 2,
        text: amendLawNum ? `${label}（${amendLawNum}）` : label,
      })
      for (const child of node.children ?? []) walk(child, blocks)
      return
    }
    case "Article":
      pushArticle(node, blocks)
      return
    case "Paragraph":
      pushParagraph(node, blocks)
      return
    default:
      for (const child of node.children ?? []) walk(child, blocks)
  }
}

const parseLawFullText = (root: XmlNode): LawTextBlock[] => {
  const blocks: LawTextBlock[] = []
  walk(root, blocks)
  return blocks.filter((block) => block.text)
}

export const collectEgovLawText = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  const laws = loadCollection<Law>("laws.json")
  const versions = loadCollection<LawVersion>("law-versions.json")
  const currentRevisions = new Map<string, string>()
  for (const version of versions) {
    if (version.current)
      currentRevisions.set(version.lawId, version.id.replace(/^version-/, ""))
  }

  const dir = join(DATA_DIR, "law-texts")
  mkdirSync(dir, { recursive: true })

  let updated = 0
  let fetched = 0
  for (const law of laws) {
    if (!law.egovLawId || law.status !== "in_force") continue

    const path = join(dir, `${law.id}.json`)
    const expectedRevision = currentRevisions.get(law.id)
    if (existsSync(path)) {
      // 取得済みでも改正で現行版が変わっていれば取り直す
      if (!expectedRevision) continue
      const existing = JSON.parse(readFileSync(path, "utf-8")) as LawText
      if (existing.revisionId === expectedRevision) continue
    }

    if (fetched >= lawTextFetchLimit) break
    fetched += 1
    try {
      const response = await fetchJson<EgovLawDataResponse>(
        `${API_BASE}/law_data/${law.egovLawId}?law_full_text_format=json`
      )
      if (!response.law_full_text) {
        errors.push(`${law.id}: 本文なし`)
        continue
      }
      const text: LawText = {
        id: `text-${law.id}`,
        lawId: law.id,
        revisionId: response.revision_info?.law_revision_id,
        fetchedAt: nowIso(),
        blocks: parseLawFullText(response.law_full_text),
      }
      writeFileSync(path, `${JSON.stringify(text, null, 2)}\n`)
      updated += 1
    } catch (error) {
      errors.push(`${law.id}: ${String(error)}`)
    }
    await sleep(500)
  }

  return { source: "e-Gov 法令本文 API", updated, errors }
}
