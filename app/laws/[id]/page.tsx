import { FC } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getBill,
  getLaw,
  getLawDocuments,
  getLaws,
  getLawVersions,
} from "lib/data"
import {
  documentTypeLabels,
  lawStatusColors,
  lawStatusLabels,
  lawTypeColor,
  lawTypeLabels,
} from "lib/labels"
import { Badge } from "components/elements/badge"
import { EmptyMessage, Section } from "components/elements/section"

export const generateStaticParams = () =>
  getLaws().map((law) => ({ id: law.id }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const law = getLaw((await params).id)
  return { title: law ? `${law.title} | Relaw` : "Relaw" }
}

const Page: FC<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const law = getLaw((await params).id)
  if (!law) notFound()
  const versions = getLawVersions(law.id)
  const documents = getLawDocuments(law.id)
  const relatedBill = law.billId ? getBill(law.billId) : undefined

  const details = (
    [
      ["法令番号", law.lawNumber],
      ["公布日", law.promulgatedAt],
      ["施行日", law.enforcedAt],
      ["廃止日", law.repealedAt],
    ] as [string, string | undefined][]
  ).filter(([, value]) => value) as [string, string][]

  return (
    <>
      <div className="detail-header">
        <div className="detail-badges">
          <Badge label={lawTypeLabels[law.lawType]} color={lawTypeColor} />
          <Badge
            label={lawStatusLabels[law.status]}
            color={lawStatusColors[law.status]}
          />
        </div>
        <h2 className="detail-title">{law.title}</h2>
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
          {(law.sourceUrl || relatedBill) && (
            <p className="detail-links">
              {law.sourceUrl && (
                <a
                  href={law.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-link"
                >
                  e-Gov 法令検索で見る ↗
                </a>
              )}
              {relatedBill && (
                <Link href={`/bills/${relatedBill.id}/`} className="text-link">
                  関連法案: {relatedBill.title}
                </Link>
              )}
            </p>
          )}
        </div>
      </Section>
      <Section title="版・改正履歴">
        {versions.length === 0 ? (
          <EmptyMessage>改正履歴なし</EmptyMessage>
        ) : (
          <ol className="timeline">
            {versions.map((version) => (
              <li key={version.id}>
                <time>{version.promulgatedAt ?? "—"}</time>
                <span className="timeline-label">{version.versionLabel}</span>
                {version.current && (
                  <span style={{ marginLeft: ".75rem" }}>
                    <Badge label="現行" color="#8fbf9f" />
                  </span>
                )}
                <p className="timeline-description">
                  {[
                    version.amendmentLawNumber,
                    version.enforcedAt && `施行 ${version.enforcedAt}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
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
