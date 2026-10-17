import { FC } from "react"
import Link from "next/link"
import {
  getBills,
  getDataUpdatedAt,
  getLaws,
  getPublicComments,
  getRecentBillEvents,
  getUpcomingLaws,
  today,
} from "lib/data"
import { billEventTypeDescriptions, billEventTypeLabels } from "lib/labels"
import { formatDate } from "lib/format"
import { filterEntries, SearchQuery, searchHref } from "lib/search"
import { getSearchIndex } from "lib/search-index"
import { getThemeItems, themes } from "lib/themes"
import { tones } from "lib/design"
import { EmptyMessage, Section } from "components/elements/section"
import { DaysLeft } from "components/elements/days-left"
import { LifecycleGuide } from "components/blocks/lifecycle-guide"
import { BillList } from "components/blocks/bill-list"
import { EntryList } from "components/blocks/entry-list"
import { lawEntry } from "components/blocks/law-list"
import { publicCommentEntry } from "components/blocks/public-comment-list"
import { SearchForm } from "components/blocks/search-form"
import { pageMetadata, siteDescription } from "lib/seo"

const FIRST_VIEW_LIMIT = 5
const RECENT_EVENT_LIMIT = 8

export const metadata = pageMetadata({
  description: siteDescription,
  path: "/",
})

const css = `
.hero{margin:0 0 2rem}
.hero h1{font-family:var(--serif);font-size:1.75rem;letter-spacing:.12em;margin:0 0 .5rem}
.hero p{color:var(--text-muted);margin:0 0 1.25rem;max-width:42rem}
.hero-updated{color:var(--text-faint);font-size:.75rem}
.home-links{display:grid;gap:.75rem;grid-template-columns:repeat(auto-fill,minmax(14rem,1fr));list-style:none;margin:0;padding:0}
.home-links a{border:1px solid var(--line);border-radius:var(--radius-lg);color:var(--text);display:block;height:100%;padding:.875rem 1rem;text-decoration:none}
.home-links a:hover{border-color:var(--accent-line);background:var(--surface-hover)}
.home-links b{color:var(--accent);display:block;margin:0 0 .25rem}
.home-links span{color:var(--text-muted);font-size:.8125rem}
`

/** 検索ページと同じ条件・同じロジックで件数を出し、「すべて見る」の遷移先と件数を一致させる */
const select = (query: Partial<SearchQuery>) =>
  filterEntries(getSearchIndex(), { q: "", sort: "updated", page: 1, ...query })

const Page: FC = () => {
  const builtOn = today()
  const billById = new Map(getBills().map((bill) => [bill.id, bill]))
  const recentEvents = getRecentBillEvents(RECENT_EVENT_LIMIT)
  const upcoming = getUpcomingLaws()

  const openQuery = { type: "pc", status: "open", sort: "date-asc" } as const
  const openIds = new Set(select(openQuery).map((entry) => entry.id))
  const openComments = getPublicComments()
    .filter((comment) => openIds.has(comment.id))
    .sort((a, b) => (a.endAt ?? "9999").localeCompare(b.endAt ?? "9999"))

  const deliberatingQuery = { type: "bill", status: "deliberating" } as const
  const deliberating = select(deliberatingQuery).map((entry) =>
    billById.get(entry.id)!
  )
  const enactedQuery = { type: "bill", status: "enacted" } as const
  const enacted = select(enactedQuery)
    .map((entry) => billById.get(entry.id)!)
    .sort((a, b) =>
      (b.promulgatedAt ?? b.enactedAt ?? "").localeCompare(
        a.promulgatedAt ?? a.enactedAt ?? ""
      )
    )

  const laws = getLaws()
  const bills = getBills()

  return (
    <>
      <style href="home" precedence="component">
        {css}
      </style>
      <div className="hero">
        <h1>Relaw</h1>
        <p>
          国会に提出された法案、公布・施行される法令、意見募集中のパブリックコメントを、公的情報源から毎日収集して整理しています。
        </p>
        <SearchForm label="法案・法令・パブリックコメントを検索" />
        <p className="hero-updated">
          データ最終更新:{" "}
          <time dateTime={getDataUpdatedAt()}>
            {formatDate(getDataUpdatedAt().slice(0, 10))}
          </time>
          （情報源は各ページに記載）
        </p>
      </div>
      <LifecycleGuide />

      <Section
        id="recent"
        title="最近の主な動き"
        moreHref="/bills/"
        moreLabel="法案一覧へ →"
      >
        <EntryList
          empty="記録された動きはありません"
          entries={recentEvents.flatMap((event) => {
            const bill = billById.get(event.billId)
            if (!bill) return []
            return [
              {
                id: event.id,
                title: bill.title,
                href: `/bills/${bill.id}/`,
                badges: [
                  {
                    label: billEventTypeLabels[event.type],
                    color: tones.info,
                    title: billEventTypeDescriptions[event.type],
                  },
                ],
                meta: [
                  formatDate(event.date),
                  bill.billNumber,
                  event.description,
                ].filter(Boolean) as string[],
              },
            ]
          })}
        />
      </Section>

      <Section
        id="upcoming"
        title="近日施行される法令"
        count={upcoming.length}
        moreHref="/laws/upcoming/"
      >
        <EntryList
          empty="施行日が今後に予定されている法令はありません"
          entries={upcoming.slice(0, FIRST_VIEW_LIMIT).map((law) => ({
            ...lawEntry(law),
            aside: law.enforcedAt && (
              <DaysLeft date={law.enforcedAt} label="施行" builtOn={builtOn} />
            ),
          }))}
        />
      </Section>

      <Section
        id="public-comments"
        title="募集中のパブリックコメント"
        count={openComments.length}
        moreHref={searchHref(openQuery)}
      >
        <EntryList
          empty="現在募集中のパブリックコメントはありません"
          entries={openComments.slice(0, FIRST_VIEW_LIMIT).map((comment) => ({
            ...publicCommentEntry(comment),
            aside: comment.endAt && (
              <DaysLeft date={comment.endAt} label="締切" builtOn={builtOn} />
            ),
          }))}
        />
      </Section>

      <Section
        id="deliberating"
        title="現在審議中の法案"
        count={deliberating.length}
        moreHref={searchHref(deliberatingQuery)}
      >
        {deliberating.length === 0 ? (
          <EmptyMessage>審議中の法案はありません</EmptyMessage>
        ) : (
          <BillList bills={deliberating.slice(0, FIRST_VIEW_LIMIT)} />
        )}
      </Section>

      <Section
        id="enacted"
        title="成立・公布された法案"
        count={enacted.length}
        moreHref={searchHref(enactedQuery)}
      >
        {enacted.length === 0 ? (
          <EmptyMessage>成立・公布された法案はありません</EmptyMessage>
        ) : (
          <BillList bills={enacted.slice(0, FIRST_VIEW_LIMIT)} />
        )}
      </Section>

      <Section id="themes" title="テーマから探す" moreHref="/themes/">
        <ul className="home-links">
          {themes.map((theme) => (
            <li key={theme.slug}>
              <Link href={`/themes/${theme.slug}/`}>
                <b>{theme.name}</b>
                <span>
                  法令 {getThemeItems(theme.slug, laws).length} 件・法案{" "}
                  {getThemeItems(theme.slug, bills).length} 件
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="tools" title="経過を追う">
        <ul className="home-links">
          <li>
            <Link href="/gantt/">
              <b>ガントチャート</b>
              <span>提出から成立・公布・施行までの時期を法案ごとに比較</span>
            </Link>
          </li>
          <li>
            <Link href="/search/">
              <b>詳細検索</b>
              <span>ステータス・テーマ・所管・日付で絞り込み</span>
            </Link>
          </li>
          <li>
            <Link href="/watchlist/">
              <b>ウォッチリスト</b>
              <span>気になる法案・法令・テーマをこのブラウザに保存</span>
            </Link>
          </li>
          <li>
            <Link href="/themes/">
              <b>テーマ別 RSS</b>
              <span>テーマごとの新しい法令・法案をフィードで購読</span>
            </Link>
          </li>
        </ul>
      </Section>
    </>
  )
}

export default Page
