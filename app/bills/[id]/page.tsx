import { FC } from "react"
import { notFound } from "next/navigation"
import {
  getBill,
  getBillDocuments,
  getBills,
  getSessionBills,
  getSessions,
  today,
} from "lib/data"
import {
  billStages,
  billStageIndex,
  billStatusColors,
  billStatusDescriptions,
  billStatusLabels,
  documentTypeLabels,
  proposerTypeLabels,
} from "lib/labels"
import { formatDate, formatSummary } from "lib/format"
import { billDescription, billOverview } from "lib/overview"
import { getBillRelations } from "lib/relations"
import { matchThemes } from "lib/themes"
import { compactText, legislationJsonLd, pageMetadata } from "lib/seo"
import { JsonLd } from "components/elements/json-ld"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"
import { lawNode } from "components/blocks/law-list"
import { BillList } from "components/blocks/bill-list"
import { PublicCommentList } from "components/blocks/public-comment-list"
import { Badge } from "components/elements/badge"
import { EmptyMessage, Section } from "components/elements/section"
import { StageFlow } from "components/elements/stage-progress"
import { Timeline } from "components/elements/timeline"
import { ChangeHistory } from "components/elements/change-history"
import { RelationGraph } from "components/elements/relation-graph"
import { WatchButton } from "components/elements/watch-button"
import {
  billTimeline,
  nextStep,
  sourceOf,
  TERMINAL_STATUSES,
} from "lib/lifecycle"

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
  const focus = TERMINAL_STATUSES.includes(bill.status)
    ? "審議経過・廃案等の状況"
    : bill.promulgatedAt
      ? "成立・公布日・施行日"
      : "審議状況・審議経過"
  return pageMetadata({
    // 同名の法案が回次をまたいで存在するため、議案番号で区別する
    title: `${bill.title}${bill.billNumber ? `（${bill.billNumber}）` : ""}｜${focus}`,
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
  const timeline = billTimeline(bill)
  const next = nextStep(timeline)
  const documents = getBillDocuments(bill.id)
  const relations = getBillRelations(bill.id)
  const description = compactText(billDescription(bill))
  const source = sourceOf(bill.sourceUrl)
  const enforcementText =
    relations.enforcements.length > 0
      ? relations.enforcements
          .map(
            (item) =>
              `${formatDate(item.date)}${
                relations.enforcements.length > 1 ? `（${item.law.title}）` : ""
              }`
          )
          .join("、")
      : bill.promulgatedAt
        ? "未確認（公的データ上で施行日を確認できていません）"
        : undefined

  const details = (
    [
      ["議案番号", bill.billNumber],
      ["提出回次", bill.submittedSession && `第${bill.submittedSession}回`],
      ["審議回次", bill.dietSession && `第${bill.dietSession}回`],
      ["提出者", bill.proposerType && proposerTypeLabels[bill.proposerType]],
      ["発議者", bill.proposerName],
      ["所管", bill.ministry],
      ["提出日", bill.submittedAt && formatDate(bill.submittedAt)],
      [
        "衆議院通過日",
        bill.passedLowerHouseAt && formatDate(bill.passedLowerHouseAt),
      ],
      [
        "参議院通過日",
        bill.passedUpperHouseAt && formatDate(bill.passedUpperHouseAt),
      ],
      ["成立日", bill.enactedAt && formatDate(bill.enactedAt)],
      ["公布日", bill.promulgatedAt && formatDate(bill.promulgatedAt)],
      ["施行日", enforcementText],
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
          // legislationDate は採択日: 法案は成立日 (未成立なら出力しない)
          legislationDate: bill.enactedAt,
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
          <WatchButton
            item={{ id: bill.id, kind: "bill", title: bill.title, href: path }}
          />
        </div>
        <h1 className="detail-title">{bill.title}</h1>
        {billStageIndex[bill.status] !== undefined && (
          <StageFlow
            steps={billStages}
            current={billStageIndex[bill.status] as number}
          />
        )}
        <p className="status-note">
          {billStatusDescriptions[bill.status]}
          {TERMINAL_STATUSES.includes(bill.status) &&
            "（成立していないため、公布・施行はありません）"}
        </p>
      </div>
      <LinkChips
        links={matchThemes(bill.title).map((theme) => ({
          label: `テーマ: ${theme.name}`,
          href: `/themes/${theme.slug}/`,
        }))}
      />
      <Section title="現在の状況" id="status">
        <div className="detail-panel">
          <dl className="detail-grid">
            <dt>ステータス</dt>
            <dd>{billStatusLabels[bill.status]}</dd>
            <dt>次の手続き</dt>
            <dd>
              {next
                ? `${next.label} ${formatDate(next.date as string)}${
                    next.note ? `（${next.note}）` : ""
                  }`
                : "公的データ上で日程が確定した予定はありません"}
            </dd>
            <dt>データ更新日</dt>
            <dd>
              {formatDate(today(Date.parse(bill.updatedAt)))}
              （Relaw が出典から取得した内容に変化があった日）
            </dd>
          </dl>
        </div>
      </Section>
      <Section title="概要" id="overview">
        <div className="detail-panel">
          <h3 className="related-heading">Relaw による整理</h3>
          <p className="detail-summary">{billOverview(bill).join("")}</p>
          <p className="status-note">
            公的データの値を組み合わせて自動作成した文章です。法的な解釈や判断を示すものではありません。
          </p>
          {bill.summary && (
            <>
              <h3 className="related-heading">議案要旨（原文）</h3>
              <blockquote className="detail-quote">
                <p className="detail-summary">{formatSummary(bill.summary)}</p>
              </blockquote>
              {source && (
                <p className="status-note">
                  出典:{" "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link"
                  >
                    {source.name} ↗
                  </a>
                </p>
              )}
            </>
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
        </div>
      </Section>
      <Section title="審議経過・今後の予定" id="lifecycle">
        <Timeline items={timeline} />
      </Section>
      <Section title="関連法令" id="related">
        {!relations.enactedLaw && relations.amendedLaws.length === 0 ? (
          <EmptyMessage>公的データ上で確認できる関連法令なし</EmptyMessage>
        ) : (
          <div className="detail-panel">
            <RelationGraph
              center={{ label: bill.title, kind: "法案" }}
              groups={[
                {
                  relation: "成立後の法律",
                  basis: "法案名（「案」を除く）と公布日が e-Gov の法令と一致",
                  side: "out",
                  nodes: relations.enactedLaw
                    ? [lawNode(relations.enactedLaw)]
                    : [],
                },
                {
                  relation: "この法案により改正された法令",
                  basis: "e-Gov 改正履歴の改正法令名・公布日が一致",
                  side: "out",
                  nodes: relations.amendedLaws.map(lawNode),
                },
              ]}
            />
          </div>
        )}
      </Section>
      {relations.publicComments.length > 0 && (
        <Section title="関連パブリックコメント" id="public-comments">
          <PublicCommentList comments={relations.publicComments} />
        </Section>
      )}
      <Section title="一次情報・関連資料" id="documents">
        <ul className="document-list">
          {source && (
            <li>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                議案情報（審議経過・議案要旨） ↗
              </a>
              <span className="document-note">{source.name}</span>
            </li>
          )}
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
        {!source && documents.length === 0 && (
          <EmptyMessage>資料なし</EmptyMessage>
        )}
        <p className="status-note">
          リンク先は各公的機関のサイトです。リンク先の移動・削除により表示できない場合があります。
        </p>
      </Section>
      <Section title="変更履歴" id="changes">
        <ChangeHistory entityId={bill.id} />
      </Section>
    </>
  )
}

export default Page
