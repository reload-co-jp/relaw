import { FC } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  getBillEvents,
  getLaw,
  getLawDocuments,
  getLaws,
  getLawText,
  getLawVersions,
  today,
} from "lib/data"
import {
  billEventTypeLabels,
  billStatusLabels,
  documentTypeLabels,
  lawStatusColors,
  lawStatusDescriptions,
  lawStatusLabels,
  lawTypeColor,
  lawTypeLabels,
} from "lib/labels"
import { formatDate } from "lib/format"
import { lawDescription, lawOverview } from "lib/overview"
import {
  getEnactmentClause,
  getIssuingBody,
  getLawRelations,
  getPurposeArticle,
} from "lib/relations"
import { compactText, legislationJsonLd, pageMetadata } from "lib/seo"
import { JsonLd } from "components/elements/json-ld"
import { Badge } from "components/elements/badge"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { EmptyMessage, Section } from "components/elements/section"
import { LawLinkList } from "components/blocks/law-list"
import { PublicCommentList } from "components/blocks/public-comment-list"

export const generateStaticParams = () =>
  getLaws().map((law) => ({ id: law.id }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ id: string }>
}) => {
  const law = getLaw((await params).id)
  if (!law)
    return pageMetadata({
      title: "法令",
      description: "指定された法令は見つかりません。",
      path: "/laws/",
    })
  return pageMetadata({
    title: `${law.title}とは？公布日・施行日・条文・改正履歴`,
    description: compactText(lawDescription(law)),
    path: `/laws/${law.id}/`,
  })
}

const DetailGrid: FC<{ rows: [string, string | undefined][] }> = ({ rows }) => (
  <dl className="detail-grid">
    {rows
      .filter(([, value]) => value)
      .map(([label, value]) => (
        <div key={label} style={{ display: "contents" }}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
  </dl>
)

interface LifecycleItem {
  date: string
  label: string
  note?: string
}

const Page: FC<{ params: Promise<{ id: string }> }> = async ({ params }) => {
  const law = getLaw((await params).id)
  if (!law) notFound()
  const path = `/laws/${law.id}/`
  const versions = getLawVersions(law.id)
  const documents = getLawDocuments(law.id)
  const lawText = getLawText(law.id)
  const relations = getLawRelations(law.id)
  const purpose = getPurposeArticle(law.id)
  const enactmentClause = getEnactmentClause(law.id)
  const description = compactText(lawDescription(law))
  const year = law.promulgatedAt?.slice(0, 4)

  const lifecycle = [
    ...relations.bills.flatMap((bill) =>
      getBillEvents(bill.id)
        .filter((event) =>
          [
            "submitted",
            "passed_lower_house",
            "passed_upper_house",
            "passed_diet",
          ].includes(event.type)
        )
        .map((event) => ({
          date: event.date,
          label: `法案${billEventTypeLabels[event.type]}`,
          note: bill.title,
        }))
    ),
    { date: law.promulgatedAt, label: "公布", note: law.lawNumber },
    {
      date: law.enforcedAt,
      label: law.enforcedAt && law.enforcedAt > today() ? "施行予定" : "施行",
    },
    ...relations.amendedBy.map(({ version }) => ({
      date: version.promulgatedAt,
      label: "改正公布",
      note: version.amendmentLawTitle ?? version.amendmentLawNumber,
    })),
  ]
    .filter((item): item is LifecycleItem => Boolean(item.date))
    .sort((a, b) => a.date.localeCompare(b.date))

  const hasRelated =
    relations.basis.length +
      relations.delegated.length +
      relations.amends.length +
      relations.bills.length >
    0

  return (
    <>
      <JsonLd
        data={legislationJsonLd({
          name: law.title,
          path,
          description,
          identifier: law.lawNumber,
          datePublished: law.promulgatedAt,
          legislationDate: law.promulgatedAt,
          legislationType: lawTypeLabels[law.lawType],
          sourceUrl: law.sourceUrl,
        })}
      />
      <Breadcrumbs
        description={description}
        items={[
          { name: "法令一覧", path: "/laws/" },
          ...(year
            ? [{ name: `${year}年公布`, path: `/laws/enacted/${year}/` }]
            : []),
          { name: law.title, path },
        ]}
      />
      <div className="detail-header">
        <div className="detail-badges">
          <Badge label={lawTypeLabels[law.lawType]} color={lawTypeColor} />
          <Badge
            label={lawStatusLabels[law.status]}
            color={lawStatusColors[law.status]}
            title={lawStatusDescriptions[law.status]}
          />
        </div>
        <h1 className="detail-title">{law.title}</h1>
        <p className="status-note">{lawStatusDescriptions[law.status]}</p>
      </div>
      <Section title={`${law.title}とは`} id="overview">
        <div className="detail-panel">
          <p className="detail-summary">{lawOverview(law).join("")}</p>
          {purpose && (
            <blockquote className="detail-quote">
              第一条（目的）: {purpose}
            </blockquote>
          )}
          {enactmentClause && (
            <blockquote className="detail-quote">
              制定文: {enactmentClause}
            </blockquote>
          )}
          <div style={{ marginTop: "1.25rem" }}>
            <DetailGrid
              rows={[
                ["法令名", law.title],
                ["公布日", law.promulgatedAt && formatDate(law.promulgatedAt)],
                ["施行日", law.enforcedAt && formatDate(law.enforcedAt)],
                ["法令番号", law.lawNumber],
                ["所管", getIssuingBody(law)],
                ["現在の状態", lawStatusLabels[law.status]],
              ]}
            />
          </div>
        </div>
      </Section>
      <Section title="基本情報" id="info">
        <div className="detail-panel">
          <DetailGrid
            rows={[
              ["法令種別", lawTypeLabels[law.lawType]],
              ["読み", law.titleKana],
              ["廃止日", law.repealedAt && formatDate(law.repealedAt)],
              ["e-Gov 法令ID", law.egovLawId],
            ]}
          />
          {law.sourceUrl && (
            <p className="detail-links">
              <a
                href={law.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                e-Gov 法令検索で見る ↗
              </a>
            </p>
          )}
        </div>
      </Section>
      <Section title="ライフサイクル" id="lifecycle">
        {lifecycle.length === 0 ? (
          <EmptyMessage>イベントなし</EmptyMessage>
        ) : (
          <ol className="timeline">
            {lifecycle.map((item, index) => (
              <li key={index}>
                <time dateTime={item.date}>{item.date}</time>
                <span className="timeline-label">{item.label}</span>
                {item.note && (
                  <p className="timeline-description">{item.note}</p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>
      <Section title={`${law.title}の改正履歴`} id="history">
        {versions.length === 0 ? (
          <EmptyMessage>改正履歴なし</EmptyMessage>
        ) : (
          <ol className="timeline">
            {versions.map((version) => {
              const amending = relations.amendedBy.find(
                (item) => item.version.id === version.id
              )?.law
              return (
                <li key={version.id}>
                  <time dateTime={version.promulgatedAt}>
                    {version.promulgatedAt ?? "—"}
                  </time>
                  <span className="timeline-label">{version.versionLabel}</span>
                  {version.current && (
                    <span style={{ marginLeft: ".75rem" }}>
                      <Badge label="現行" color="#8fbf9f" />
                    </span>
                  )}
                  <p className="timeline-description">
                    {amending ? (
                      <Link
                        href={`/laws/${amending.id}/`}
                        className="text-link"
                      >
                        {amending.title}
                      </Link>
                    ) : (
                      version.amendmentLawTitle
                    )}
                    {version.enforcedAt &&
                      `${version.amendmentLawTitle ? " · " : ""}施行 ${version.enforcedAt}`}
                  </p>
                </li>
              )
            })}
          </ol>
        )}
      </Section>
      <Section title="関連法令・関連法案" id="related">
        {!hasRelated ? (
          <EmptyMessage>公的データ上で確認できる関連法令なし</EmptyMessage>
        ) : (
          <div className="detail-panel">
            {relations.bills.length > 0 && (
              <>
                <h3 className="related-heading">成立前の法案</h3>
                <ul className="document-list">
                  {relations.bills.map((bill) => (
                    <li key={bill.id}>
                      <Link href={`/bills/${bill.id}/`} className="text-link">
                        {bill.title}
                      </Link>
                      <span className="document-note">
                        {[bill.billNumber, billStatusLabels[bill.status]]
                          .filter(Boolean)
                          .join(" / ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <LawLinkList heading="根拠法令" laws={relations.basis} />
            <LawLinkList
              heading="この法令に基づく政令・省令（施行令・施行規則等）"
              laws={relations.delegated}
            />
            <LawLinkList
              heading="この法令が改正した法令"
              laws={relations.amends}
            />
          </div>
        )}
      </Section>
      {relations.publicComments.length > 0 && (
        <Section title="関連パブリックコメント" id="public-comments">
          <PublicCommentList comments={relations.publicComments} />
        </Section>
      )}
      {documents.length > 0 && (
        <Section title="関連資料" id="documents">
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
        </Section>
      )}
      <Section title="条文" id="text">
        {!lawText || lawText.blocks.length === 0 ? (
          <EmptyMessage>条文データなし</EmptyMessage>
        ) : (
          <div className="detail-panel law-text">
            {lawText.blocks.map((block, index) => {
              if (block.type === "heading")
                return (
                  <h4
                    key={index}
                    className={`law-text-heading law-text-heading-${block.level ?? 1}`}
                  >
                    {block.text}
                  </h4>
                )
              if (block.type === "caption")
                return (
                  <p key={index} className="law-text-caption">
                    {block.text}
                  </p>
                )
              if (block.type === "item")
                return (
                  <p
                    key={index}
                    className="law-text-item"
                    style={{ paddingLeft: `${(block.level ?? 1) * 1.25}rem` }}
                  >
                    {block.text}
                  </p>
                )
              return (
                <p key={index} className="law-text-paragraph">
                  {block.text}
                </p>
              )
            })}
          </div>
        )}
      </Section>
    </>
  )
}

export default Page
