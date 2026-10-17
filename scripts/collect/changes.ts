/**
 * 収集前後の値を比べ、実際に値が変わった項目だけを data/changes.json に追記する。
 * updatedAt (取得日時) だけの変化は内容の変更とみなさない。新規エントリは記録しない。
 * 記録は本機能の導入以降の収集分のみで、過去分は遡って作らない。
 */
import { loadCollection, nowIso, saveCollection } from "./lib.ts"

export interface Change {
  id: string
  entityType: "bill" | "law" | "public_comment"
  entityId: string
  field: string
  before: string | null
  after: string | null
  detectedAt: string
}

const tracked = {
  bill: {
    file: "bills.json",
    fields: [
      "title",
      "status",
      "billNumber",
      "submittedAt",
      "passedLowerHouseAt",
      "passedUpperHouseAt",
      "enactedAt",
      "promulgatedAt",
      "enforcedAt",
    ],
  },
  law: {
    file: "laws.json",
    fields: [
      "title",
      "status",
      "lawNumber",
      "promulgatedAt",
      "enforcedAt",
      "repealedAt",
    ],
  },
  public_comment: {
    file: "public-comments.json",
    fields: ["title", "status", "endAt", "resultPublishedAt", "resultUrl"],
  },
} as const

type Snapshot = Record<string, Map<string, Record<string, unknown>>>

export const snapshot = (): Snapshot =>
  Object.fromEntries(
    Object.entries(tracked).map(([type, { file }]) => [
      type,
      new Map(
        loadCollection<Record<string, unknown> & { id: string }>(file).map(
          (item) => [item.id, item]
        )
      ),
    ])
  )

const asValue = (value: unknown): string | null =>
  value === undefined || value === null || value === ""
    ? null
    : String(value)

export const recordChanges = (before: Snapshot): number => {
  const after = snapshot()
  const detectedAt = nowIso()
  const changes: Change[] = []
  for (const [type, { fields }] of Object.entries(tracked)) {
    for (const [id, current] of after[type]) {
      const previous = before[type].get(id)
      if (!previous) continue
      for (const field of fields) {
        const from = asValue(previous[field])
        const to = asValue(current[field])
        if (from === to) continue
        changes.push({
          id: `change-${id}-${field}-${detectedAt}`,
          entityType: type as Change["entityType"],
          entityId: id,
          field,
          before: from,
          after: to,
          detectedAt,
        })
      }
    }
  }
  if (changes.length > 0)
    saveCollection("changes.json", [
      ...loadCollection<Change>("changes.json"),
      ...changes,
    ])
  return changes.length
}
