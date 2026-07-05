import { FC } from "react"
import type { PublicComment } from "lib/types"
import {
  publicCommentStatusColors,
  publicCommentStatusDescriptions,
  publicCommentStatusLabels,
} from "lib/labels"
import { Entry, EntryList } from "components/blocks/entry-list"

export const publicCommentEntry = (comment: PublicComment): Entry => ({
  id: comment.id,
  title: comment.title,
  externalUrl: comment.sourceUrl,
  badges: [
    {
      label: publicCommentStatusLabels[comment.status],
      color: publicCommentStatusColors[comment.status],
      title: publicCommentStatusDescriptions[comment.status],
    },
  ],
  meta: [
    comment.ministry,
    comment.startAt && `募集期間 ${comment.startAt} 〜 ${comment.endAt ?? ""}`,
    comment.resultPublishedAt && `結果公表 ${comment.resultPublishedAt}`,
  ].filter(Boolean) as string[],
  links: [
    comment.billId && {
      label: "関連法案",
      href: `/bills/${comment.billId}/`,
    },
    comment.lawId && {
      label: "関連法令",
      href: `/laws/${comment.lawId}/`,
    },
    comment.resultUrl && {
      label: "結果公表ページ",
      href: comment.resultUrl,
      external: true,
    },
  ].filter(Boolean) as Entry["links"],
})

export const PublicCommentList: FC<{ comments: PublicComment[] }> = ({
  comments,
}) => <EntryList entries={comments.map(publicCommentEntry)} />
