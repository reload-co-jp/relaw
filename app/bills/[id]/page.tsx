import { FC } from "react"
import { notFound } from "next/navigation"
import {
  getBill,
  getBillDocuments,
  getBillEvents,
  getBills,
  getSessionBills,
  getSessions,
} from "lib/data"
import {
  billEventTypeDescriptions,
  billEventTypeLabels,
  billStages,
  billStageIndex,
  billStatusColors,
  billStatusDescriptions,
  billStatusLabels,
  documentTypeLabels,
  proposerTypeLabels,
} from "lib/labels"
import { formatSummary } from "lib/format"
import { billDescription, billOverview } from "lib/overview"
import { getBillRelations } from "lib/relations"
import { matchThemes } from "lib/themes"
import { compactText, legislationJsonLd, pageMetadata } from "lib/seo"
import { JsonLd } from "components/elements/json-ld"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"
import { LawLinkList } from "components/blocks/law-list"
import { BillList } from "components/blocks/bill-list"
import { PublicCommentList } from "components/blocks/public-comment-list"
import { Badge } from "components/elements/badge"
import { EmptyMessage, Section } from "components/elements/section"
import { StageFlow } from "components/elements/stage-progress"

/**
 * /bills/{id}/ (個別法案) と /bills/{session}/ (国会回次別一覧) を同じ動的セグメントで扱う。
 * 法案 ID は "bill-" で始まるため数値の回次と衝突しない。
 */
const parseSession = (id: string): number | undefined =>
  /^\d+$/.test(id) && getSessions().includes(Number(id))
    ? Number(id)
    : undefined

export const generateStaticParams = () => [
  ...getBills().map((bill) => ({ id: bill.id })),
  ...getSessions().map((session) => ({ id: String(session) })),
]

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const { id } = await params
  const session = parseSession(id)
  if (session !== undefined) {
    const bills = getSessionBills(session)
    const enacted = bills.filter((bill) => bill.promulgatedAt)
    return pageMetadata({
      title: `第${session}回国会の法案一覧｜提出・成立・廃案`,
      description: `第${session}回国会で提出・審議された法律案${bills.length}件の一覧。うち${enacted.length}件が公布済み。各法案の審議経過・成立状況・関連法令を確認できます。`,
      path: `/bills/${session}/`,
    })
  }
  const bill = getBill(id)
  if (!bill)
    return pageMetadata({
      title: "法案",
      description: "指定された法案は見つかりません。",
      path: "/bills/",
    })
  return pageMetadata({
    title: `${bill.title}｜成立状況・審議経過・施行日`,
    description: compactText(billDescription(bill)),
    path: `/bills/${bill.id}/`,
  })
}

const SessionPage: FC<{ session: number }> = ({ session }) => {
  const bills = getSessionBills(session)
  const enacted = ["passed_diet", "promulgated", "enforced"]
  const deliberating = [
    "submitted",
    "committee_review",
    "passed_lower_house",
    "passed_upper_house",
  ]
  const groups = [
    {
      title: "成立・公布",
      bills: bills.filter((bill) => enacted.includes(bill.status)),
    },
    {
      title: "審議中",
      bills: bills.filter((bill) => deliberating.includes(bill.status)),
    },
    {
      title: "廃案・否決・撤回",
      bills: bills.filter(
        (bill) =>
          !enacted.includes(bill.status) && !deliberating.includes(bill.status)
      ),
    },
  ].filter((group) => group.bills.length > 0)
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "法案一覧", path: "/bills/" },
          { name: `第${session}回国会`, path: `/bills/${session}/` },
        ]}
      />
      <h1 className="detail-title">第{session}回国会の法案一覧</h1>
      <p className="status-note">
        第{session}回国会で提出、または継続審査により審議された法律案{" "}
        {bills.length} 件。
      </p>
      <LinkChips
        links={getSessions().map((item) => ({
          label: `第${item}回`,
          href: `/bills/${item}/`,
        }))}
      />
      {groups.map((group) => (
        <Section
          key={group.title}
          title={group.title}
          count={group.bills.length}
        >
          <BillList bills={group.bills} />
        </Section>
      ))}
    </>
  )
}

const Page: FC<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const { id } = await params
  const session = parseSession(id)
  if (session !== undefined) return <SessionPage session={session} />
  const bill = getBill(id)
  if (!bill) notFound()
  const path = `/bills/${bill.id}/`
  const events = getBillEvents(bill.id)
  const documents = getBillDocuments(bill.id)
  const relations = getBillRelations(bill.id)
  const description = compactText(billDescription(bill))

  const details = (
    [
      ["議案番号", bill.billNumber],
      ["提出回次", bill.submittedSession && `第${bill.submittedSession}回`],
      ["審議回次", bill.dietSession && `第${bill.dietSession}回`],
      ["提出者", bill.proposerType && proposerTypeLabels[bill.proposerType]],
      ["発議者", bill.proposerName],
      ["所管", bill.ministry],
      ["提出日", bill.submittedAt],
      ["衆議院通過日", bill.passedLowerHouseAt],
      ["参議院通過日", bill.passedUpperHouseAt],
      ["成立日", bill.enactedAt],
      ["公布日", bill.promulgatedAt],
      ["施行日", bill.enforcedAt],
    ] as [string, string | undefined][]
  ).filter(([, value]) => value) as [string, string][]

  return (
    <>
      <JsonLd
        data={legislationJsonLd({
          name: bill.title,
          path,
          description,
          identifier: bill.billNumber,
          datePublished: bill.promulgatedAt,
          legislationDate: bill.submittedAt,
          legislationType: "法律案",
          sourceUrl: bill.sourceUrl,
        })}
      />
      <Breadcrumbs
        description={description}
        items={[
          { name: "法案一覧", path: "/bills/" },
          ...(bill.dietSession
            ? [
                {
                  name: `第${bill.dietSession}回国会`,
                  path: `/bills/${bill.dietSession}/`,
                },
              ]
            : []),
          { name: bill.title, path },
        ]}
      />
      <div className="detail-header">
        <div className="detail-badges">
          <Badge
            label={billStatusLabels[bill.status]}
            color={billStatusColors[bill.status]}
            title={billStatusDescriptions[bill.status]}
          />
        </div>
        <h1 className="detail-title">{bill.title}</h1>
        {billStageIndex[bill.status] !== undefined && (
          <StageFlow
            steps={billStages}
            current={billStageIndex[bill.status] as number}
          />
        )}
        <p className="status-note">{billStatusDescriptions[bill.status]}</p>
      </div>
      <LinkChips
        links={matchThemes(bill.title).map((theme) => ({
          label: `テーマ: ${theme.name}`,
          href: `/themes/${theme.slug}/`,
        }))}
      />
      <Section title="概要" id="overview">
        <div className="detail-panel">
          <p className="detail-summary">{billOverview(bill).join("")}</p>
          {bill.summary && (
            <blockquote className="detail-quote">
              <p className="detail-summary">
                議案要旨{"\n"}
                {formatSummary(bill.summary)}
              </p>
            </blockquote>
          )}
        </div>
      </Section>
      <Section title="基本情報" id="info">
        <div className="detail-panel">
          <dl className="detail-grid">
            {details.map(([label, value]) => (
              <div key={label} style={{ display: "contents" }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {bill.sourceUrl && (
            <p className="detail-links">
              <a
                href={bill.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                出典元ページ ↗
              </a>
            </p>
          )}
        </div>
      </Section>
      <Section title="ライフサイクル（審議経過）" id="lifecycle">
        {events.length === 0 ? (
          <EmptyMessage>イベントなし</EmptyMessage>
        ) : (
          <ol className="timeline">
            {events.map((event) => (
              <li key={event.id}>
                <time>{event.date}</time>
                <span
                  className="timeline-label has-help"
                  title={billEventTypeDescriptions[event.type]}
                >
                  {billEventTypeLabels[event.type]}
                </span>
                {event.description && (
                  <p className="timeline-description">{event.description}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Section title="関連法令" id="related">
        {!relations.enactedLaw && relations.amendedLaws.length === 0 ? (
          <EmptyMessage>公的データ上で確認できる関連法令なし</EmptyMessage>
        ) : (
          <div className="detail-panel">
            <LawLinkList
              heading="成立後の法律"
              laws={relations.enactedLaw ? [relations.enactedLaw] : []}
            />
            <LawLinkList
              heading="この法案により改正された法令"
              laws={relations.amendedLaws}
            />
          </div>
        )}
      </Section>
      {relations.publicComments.length > 0 && (
        <Section title="関連パブリックコメント" id="public-comments">
          <PublicCommentList comments={relations.publicComments} />
        </Section>
      )}
      <Section title="関連資料" id="documents">
        {documents.length === 0 ? (
          <EmptyMessage>資料なし</EmptyMessage>
        ) : (
          <ul className="document-list">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  {doc.title} ↗
                </a>
                <span className="document-note">
                  {documentTypeLabels[doc.type]} / {doc.source}
                  {doc.format === "pdf" && " / PDF"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  )
}

export default Page
