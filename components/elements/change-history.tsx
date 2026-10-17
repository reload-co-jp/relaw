import { FC } from "react"
import { getChanges } from "lib/data"
import { formatDate, today } from "lib/format"
import {
  billStatusLabels,
  lawStatusLabels,
  publicCommentStatusLabels,
} from "lib/labels"
import type { Change } from "lib/types"
import { EmptyMessage } from "components/elements/section"

/** 変更履歴の記録開始日 (scripts/collect/changes.ts の導入日) */
const RECORDING_SINCE = "2026-10-18"

const fieldLabels: Record<string, string> = {
  title: "名称",
  status: "ステータス",
  billNumber: "議案番号",
  lawNumber: "法令番号",
  submittedAt: "提出日",
  passedLowerHouseAt: "衆議院通過日",
  passedUpperHouseAt: "参議院通過日",
  enactedAt: "成立日",
  promulgatedAt: "公布日",
  enforcedAt: "施行日",
  repealedAt: "廃止日",
  endAt: "締切日",
  resultPublishedAt: "結果公表日",
  resultUrl: "結果公表ページ",
}

const statusLabels: Record<Change["entityType"], Record<string, string>> = {
  bill: billStatusLabels,
  law: lawStatusLabels,
  public_comment: publicCommentStatusLabels,
}

const display = (change: Change, value: string | null): string => {
  if (value === null) return "（なし）"
  if (change.field === "status")
    return statusLabels[change.entityType][value] ?? value
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value)
  return value
}

export const ChangeHistory: FC<{ entityId: string }> = ({ entityId }) => {
  const changes = getChanges(entityId)
  return (
    <>
      {changes.length === 0 ? (
        <EmptyMessage>記録された変更なし</EmptyMessage>
      ) : (
        <ul className="document-list">
          {changes.map((change) => (
            <li key={change.id}>
              <b>{fieldLabels[change.field] ?? change.field}</b>:{" "}
              {display(change, change.before)} → {display(change, change.after)}
              <span className="document-note">
                検出 {formatDate(today(Date.parse(change.detectedAt)))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="status-note">
        収集データの値が実際に変わった場合のみ記録しています（
        {formatDate(RECORDING_SINCE)}
        以降の収集分。それ以前の変更は記録されていません）。
      </p>
    </>
  )
}
