import { FC } from "react"
import { notFound } from "next/navigation"
import { getBill, getBillDocuments, getBillEvents, getBills } from "lib/data"
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
import { compactText, pageMetadata } from "lib/seo"
import { Badge } from "components/elements/badge"
import { EmptyMessage, Section } from "components/elements/section"
import { StageFlow } from "components/elements/stage-progress"

export const generateStaticParams = () =>
  getBills().map((bill) => ({ id: bill.id }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const bill = getBill((await params).id)
  if (!bill)
    return pageMetadata({
      title: "法案",
      description: "指定された法案は見つかりません。",
      path: "/bills/",
    })
  const description = compactText(
    bill.summary ??
      [
        bill.billNumber,
        bill.ministry,
        bill.submittedAt && `提出 ${bill.submittedAt}`,
        bill.promulgatedAt && `公布 ${bill.promulgatedAt}`,
        billStatusLabels[bill.status],
      ]
        .filter(Boolean)
        .join("。")
  )
  return pageMetadata({
    title: bill.title,
    description,
    path: `/bills/${bill.id}/`,
  })
}

const Page: FC<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const bill = getBill((await params).id)
  if (!bill) notFound()
  const events = getBillEvents(bill.id)
  const documents = getBillDocuments(bill.id)

  const details = (
    [
      ["議案番号", bill.billNumber],
      ["国会回次", bill.dietSession && `第${bill.dietSession}回`],
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
      <div className="detail-header">
        <div className="detail-badges">
          <Badge
            label={billStatusLabels[bill.status]}
            color={billStatusColors[bill.status]}
            title={billStatusDescriptions[bill.status]}
          />
        </div>
        <h2 className="detail-title">{bill.title}</h2>
        {billStageIndex[bill.status] !== undefined && (
          <StageFlow
            steps={billStages}
            current={billStageIndex[bill.status] as number}
          />
        )}
        <p className="status-note">{billStatusDescriptions[bill.status]}</p>
      </div>
      <Section title="基本情報">
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
      {bill.summary && (
        <Section title="概要">
          <div className="detail-panel">
            <p className="detail-summary">{formatSummary(bill.summary)}</p>
          </div>
        </Section>
      )}
      <Section title="時系列イベント">
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
      <Section title="関連資料">
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
