import {
  getBills,
  getLatestBillEvents,
  getLaws,
  getPublicComments,
} from "./data"
import { getBillRelations, getIssuingBody } from "./relations"
import { billStatusGroup, normalizeText, SearchEntry } from "./search"
import { matchThemes } from "./themes"
import { billSearchText } from "components/blocks/bill-list"
import { lawSearchText } from "components/blocks/law-list"
import { publicCommentSearchText } from "components/blocks/public-comment-list"

const SUMMARY_LENGTH = 120

const themeSlugs = (title: string): string[] =>
  matchThemes(title).map((theme) => theme.slug)

let cache: SearchEntry[] | undefined

/** 検索インデックス (法案・法令・パブコメ)。/search-index.json として配信し、トップの件数計算にも使う */
export const getSearchIndex = (): SearchEntry[] => {
  if (cache) return cache
  const latestEvents = getLatestBillEvents()
  cache = [
    ...getBills().map((bill): SearchEntry => ({
      id: bill.id,
      kind: "bill",
      title: bill.title,
      href: `/bills/${bill.id}/`,
      status: bill.status,
      statusGroup: billStatusGroup(bill.status),
      themes: themeSlugs(bill.title),
      dates: {
        submitted: bill.submittedAt,
        enacted: bill.enactedAt,
        promulgated: bill.promulgatedAt,
        enforced: getBillRelations(bill.id).enforcements[0]?.date,
      },
      updatedAt: bill.updatedAt,
      text: normalizeText(billSearchText(bill, latestEvents.get(bill.id))),
      summary: bill.summary?.slice(0, SUMMARY_LENGTH),
    })),
    ...getLaws().map((law): SearchEntry => ({
      id: law.id,
      kind: "law",
      title: law.title,
      href: `/laws/${law.id}/`,
      status: law.status,
      statusGroup: law.status,
      themes: themeSlugs(law.title),
      ministry: getIssuingBody(law),
      dates: { promulgated: law.promulgatedAt, enforced: law.enforcedAt },
      updatedAt: law.updatedAt,
      text: normalizeText(lawSearchText(law)),
    })),
    ...getPublicComments().map((comment): SearchEntry => ({
      id: comment.id,
      kind: "pc",
      title: comment.title,
      href: comment.sourceUrl ?? "",
      external: true,
      status: comment.status,
      statusGroup: comment.status,
      themes: themeSlugs(comment.title),
      ministry: comment.ministry,
      dates: { deadline: comment.endAt },
      updatedAt: comment.updatedAt,
      text: normalizeText(publicCommentSearchText(comment)),
    })),
  ].map((entry) => ({
    ...entry,
    // 未確定の日付キーは出力しない
    dates: Object.fromEntries(
      Object.entries(entry.dates).filter(([, value]) => value)
    ),
  }))
  return cache
}

/** 省庁の選択肢 (データに現れるもの) */
export const getSearchMinistries = (): string[] =>
  [
    ...new Set(
      getSearchIndex()
        .map((entry) => entry.ministry)
        .filter((ministry): ministry is string => Boolean(ministry))
    ),
  ].sort((a, b) => a.localeCompare(b, "ja"))
