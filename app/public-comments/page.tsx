import { FC, Fragment } from "react"
import Link from "next/link"
import { getPublicComments } from "lib/data"
import {
  publicCommentStatusColors,
  publicCommentStatusLabels,
} from "lib/labels"
import type { PublicComment } from "lib/types"
import { Badge } from "components/elements/badge"
import { EmptyMessage, Section } from "components/elements/section"

export const metadata = {
  title: "パブリックコメント | Relaw",
}

const meta = (comment: PublicComment): string[] =>
  [
    comment.ministry,
    comment.startAt && `募集期間 ${comment.startAt} 〜 ${comment.endAt ?? ""}`,
    comment.resultPublishedAt && `結果公表 ${comment.resultPublishedAt}`,
  ].filter(Boolean) as string[]

const Page: FC = () => {
  const comments = getPublicComments()
  return (
    <Section title="パブリックコメント" count={comments.length}>
      {comments.length === 0 ? (
        <EmptyMessage>該当なし</EmptyMessage>
      ) : (
        <ul className="card-list">
          {comments.map((comment) => (
            <li key={comment.id} className="card">
              <div className="card-title-row">
                <Badge
                  label={publicCommentStatusLabels[comment.status]}
                  color={publicCommentStatusColors[comment.status]}
                />
                {comment.sourceUrl ? (
                  <a
                    href={comment.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-title"
                  >
                    {comment.title}
                  </a>
                ) : (
                  <span className="card-title">{comment.title}</span>
                )}
              </div>
              {meta(comment).length > 0 && (
                <p className="card-meta">
                  {meta(comment).map((item, index) => (
                    <Fragment key={item}>
                      {index > 0 && <span className="card-meta-sep">·</span>}
                      {item}
                    </Fragment>
                  ))}
                </p>
              )}
              {(comment.billId || comment.lawId || comment.resultUrl) && (
                <p className="card-meta">
                  {comment.billId && (
                    <Link
                      href={`/bills/${comment.billId}/`}
                      className="text-link"
                      style={{ marginRight: "1.25rem" }}
                    >
                      関連法案
                    </Link>
                  )}
                  {comment.lawId && (
                    <Link
                      href={`/laws/${comment.lawId}/`}
                      className="text-link"
                      style={{ marginRight: "1.25rem" }}
                    >
                      関連法令
                    </Link>
                  )}
                  {comment.resultUrl && (
                    <a
                      href={comment.resultUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      結果公表ページ ↗
                    </a>
                  )}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}

export default Page
