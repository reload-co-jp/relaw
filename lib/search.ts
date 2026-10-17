/**
 * 検索条件の解釈 (URL ⇔ 条件) と絞り込み。検索ページ (クライアント)・トップの件数・ガントで共有し、
 * どこでも同じ条件が同じ結果になるようにする。Node 依存を持たない。
 */
export type SearchKind = "bill" | "law" | "pc"
export type DateField =
  "submitted" | "enacted" | "promulgated" | "enforced" | "deadline"
export type SortOrder = "updated" | "date-desc" | "date-asc"

export interface SearchEntry {
  id: string
  kind: SearchKind
  title: string
  href: string
  external?: boolean
  status: string
  statusGroup: string
  themes: string[]
  ministry?: string
  dates: Partial<Record<DateField, string>>
  updatedAt: string
  /** 小文字化済みの検索対象テキスト */
  text: string
  summary?: string
}

export interface SearchQuery {
  q: string
  type?: SearchKind
  status?: string
  theme?: string
  ministry?: string
  date?: DateField
  from?: string
  to?: string
  sort: SortOrder
  page: number
}

export const kindLabels: Record<SearchKind, string> = {
  bill: "法案",
  law: "法令",
  pc: "パブリックコメント",
}

export const statusGroups: {
  value: string
  label: string
  kind: SearchKind
}[] = [
  { value: "deliberating", label: "審議中", kind: "bill" },
  { value: "enacted", label: "成立・公布", kind: "bill" },
  { value: "ended", label: "廃案・否決・撤回", kind: "bill" },
  { value: "in_force", label: "施行中", kind: "law" },
  { value: "not_yet_enforced", label: "未施行", kind: "law" },
  { value: "repealed", label: "廃止", kind: "law" },
  { value: "open", label: "意見募集中", kind: "pc" },
  { value: "closed", label: "募集終了", kind: "pc" },
  { value: "result_published", label: "結果公表済", kind: "pc" },
]

export const dateFieldLabels: Record<DateField, string> = {
  submitted: "提出日",
  enacted: "成立日",
  promulgated: "公布日",
  enforced: "施行日",
  deadline: "意見募集の締切日",
}

export const sortLabels: Record<SortOrder, string> = {
  updated: "データ更新が新しい順",
  "date-desc": "日付が新しい順",
  "date-asc": "日付が古い順",
}

const BILL_GROUPS: Record<string, string> = {
  submitted: "deliberating",
  committee_review: "deliberating",
  passed_lower_house: "deliberating",
  passed_upper_house: "deliberating",
  passed_diet: "enacted",
  promulgated: "enacted",
  enforced: "enacted",
  withdrawn: "ended",
  rejected: "ended",
  expired: "ended",
}

/** 法案ステータス → 絞り込み用グループ (審議中 / 成立・公布 / 廃案等) */
export const billStatusGroup = (status: string): string =>
  BILL_GROUPS[status] ?? "other"

export const PAGE_SIZE = 50

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const isDate = (value: string | null): value is string =>
  value !== null && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value))

const pick = <T extends string>(
  value: string | null,
  allowed: readonly T[]
): T | undefined => (allowed.includes(value as T) ? (value as T) : undefined)

/** 不正な値・未知のパラメータは無視する (エラーにしない) */
export const parseQuery = (
  params: URLSearchParams,
  options: { themes: string[] }
): SearchQuery => {
  const type = pick(params.get("type"), ["bill", "law", "pc"] as const)
  const status = statusGroups.find(
    (group) =>
      group.value === params.get("status") && (!type || group.kind === type)
  )?.value
  const date = pick(
    params.get("date"),
    Object.keys(dateFieldLabels) as DateField[]
  )
  const page = Number(params.get("page"))
  return {
    q: (params.get("q") ?? "").trim().slice(0, 200),
    type,
    status,
    theme: pick(params.get("theme"), options.themes),
    ministry: params.get("ministry")?.trim() || undefined,
    date,
    from: date && isDate(params.get("from")) ? params.get("from")! : undefined,
    to: date && isDate(params.get("to")) ? params.get("to")! : undefined,
    sort:
      pick(params.get("sort"), Object.keys(sortLabels) as SortOrder[]) ??
      "updated",
    page: Number.isInteger(page) && page > 1 ? page : 1,
  }
}

/** 空・既定値のパラメータは出力しない */
export const toSearchParams = (query: Partial<SearchQuery>): string => {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.type) params.set("type", query.type)
  if (query.status) params.set("status", query.status)
  if (query.theme) params.set("theme", query.theme)
  if (query.ministry) params.set("ministry", query.ministry)
  if (query.date) {
    params.set("date", query.date)
    if (query.from) params.set("from", query.from)
    if (query.to) params.set("to", query.to)
  }
  if (query.sort && query.sort !== "updated") params.set("sort", query.sort)
  if (query.page && query.page > 1) params.set("page", String(query.page))
  return params.toString()
}

export const searchHref = (query: Partial<SearchQuery>): string => {
  const params = toSearchParams(query)
  return params ? `/search/?${params}` : "/search/"
}

export const normalizeText = (value: string): string =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim()

/** 並び替えに使う日付: 指定の日付項目、無ければ種別ごとの代表日付 */
const sortDate = (entry: SearchEntry, field?: DateField): string | undefined =>
  field
    ? entry.dates[field]
    : entry.kind === "bill"
      ? entry.dates.submitted
      : entry.kind === "law"
        ? entry.dates.promulgated
        : entry.dates.deadline

export const filterEntries = (
  entries: SearchEntry[],
  query: SearchQuery
): SearchEntry[] => {
  const terms = normalizeText(query.q).split(" ").filter(Boolean)
  const status = statusGroups.find((group) => group.value === query.status)
  const matched = entries.filter((entry) => {
    if (query.type && entry.kind !== query.type) return false
    if (
      status &&
      (entry.kind !== status.kind || entry.statusGroup !== status.value)
    )
      return false
    if (query.theme && !entry.themes.includes(query.theme)) return false
    if (query.ministry && entry.ministry !== query.ministry) return false
    if (query.date) {
      // 日付が未確定の項目は日付条件に一致させない
      const value = entry.dates[query.date]
      if (!value) return false
      if (query.from && value < query.from) return false
      if (query.to && value > query.to) return false
    }
    return terms.every((term) => entry.text.includes(term))
  })
  if (query.sort === "updated")
    return matched.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const direction = query.sort === "date-asc" ? 1 : -1
  // 日付の無い項目は並び順にかかわらず末尾
  return matched.sort((a, b) => {
    const left = sortDate(a, query.date)
    const right = sortDate(b, query.date)
    if (!left || !right) return left ? -1 : right ? 1 : 0
    return left.localeCompare(right) * direction
  })
}
