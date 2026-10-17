import { test } from "node:test"
import assert from "node:assert/strict"
import { segmentsOf } from "./gantt.ts"

const base = { enforcements: [] as string[] }

test("施行日が未記録なら公布後の帯は未確認として今日まで", () => {
  const segments = segmentsOf(
    {
      ...base,
      submitted: "2026-01-10",
      enacted: "2026-03-01",
      promulgated: "2026-03-10",
    },
    false,
    "2026-10-18"
  )
  assert.deepEqual(segments.at(-1), {
    from: "2026-03-10",
    to: "2026-10-18",
    phase: "toEnforcement",
    uncertain: true,
  })
})

test("施行日が記録されていればその日まで (未来でも確定として扱う)", () => {
  const segments = segmentsOf(
    {
      ...base,
      submitted: "2026-01-10",
      promulgated: "2026-03-10",
      enforcements: ["2027-04-01"],
    },
    false,
    "2026-10-18"
  )
  assert.equal(segments.at(-1)?.to, "2027-04-01")
  assert.equal(segments.at(-1)?.uncertain, undefined)
})

test("廃案で終了日の記録がなければ最終イベントまでを未確認として表示", () => {
  const segments = segmentsOf(
    { ...base, submitted: "2026-01-10", lastEventDate: "2026-06-21" },
    true,
    "2026-10-18"
  )
  assert.deepEqual(segments, [
    {
      from: "2026-01-10",
      to: "2026-06-21",
      phase: "terminated",
      uncertain: true,
    },
  ])
})

test("提出日がなければ描画しない", () => {
  assert.deepEqual(segmentsOf(base, false, "2026-10-18"), [])
})
