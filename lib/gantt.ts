/**
 * ガントチャートの帯・マーカー計算 (Node 依存なし)。日付は billMilestones (lib/lifecycle.ts) と同じものを使う。
 * 記録のない日付には帯を伸ばさず、未確認の区間は uncertain として区別する。
 */
import type { BillMilestones } from "./lifecycle"

export type Phase =
  "deliberation" | "toPromulgation" | "toEnforcement" | "terminated"

export interface Segment {
  from: string
  to: string
  phase: Phase
  /** 終端の日付が記録されていない (今日・最終記録日までを仮に表示) */
  uncertain?: boolean
}

export interface Marker {
  date: string
  label: string
}

export const segmentsOf = (
  milestones: BillMilestones,
  terminated: boolean,
  today: string
): Segment[] => {
  const { submitted, enacted, promulgated, enforcements } = milestones
  if (!submitted) return []
  if (terminated) {
    const end = milestones.terminated?.date ?? milestones.lastEventDate
    return end && end >= submitted
      ? [
          {
            from: submitted,
            to: end,
            phase: "terminated",
            uncertain: !milestones.terminated,
          },
        ]
      : []
  }
  const boundaries: { at: string; phase: Phase }[] = [
    { at: submitted, phase: "deliberation" },
  ]
  if (enacted) boundaries.push({ at: enacted, phase: "toPromulgation" })
  if (promulgated) boundaries.push({ at: promulgated, phase: "toEnforcement" })
  const enforced = enforcements[0]
  return boundaries
    .map((boundary, index): Segment => {
      const next = boundaries[index + 1]?.at
      if (next) return { from: boundary.at, to: next, phase: boundary.phase }
      if (boundary.phase === "toEnforcement")
        return enforced
          ? { from: boundary.at, to: enforced, phase: boundary.phase }
          : {
              from: boundary.at,
              to: today,
              phase: boundary.phase,
              uncertain: true,
            }
      // 審議中・公布待ちは今日時点まで継続中
      return { from: boundary.at, to: today, phase: boundary.phase }
    })
    .filter((segment) => segment.from <= segment.to)
}

export const markersOf = (milestones: BillMilestones): Marker[] =>
  [
    milestones.submitted && { date: milestones.submitted, label: "提出" },
    milestones.enacted && { date: milestones.enacted, label: "成立" },
    milestones.promulgated && { date: milestones.promulgated, label: "公布" },
    ...milestones.enforcements.map((date) => ({
      date,
      label: milestones.enforcements.length > 1 ? "施行（一部）" : "施行",
    })),
    milestones.terminated && {
      date: milestones.terminated.date,
      label: milestones.terminated.label,
    },
  ].filter(Boolean) as Marker[]
