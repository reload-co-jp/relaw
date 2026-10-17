import { test } from "node:test"
import assert from "node:assert/strict"
import {
  filterEntries,
  parseQuery,
  type SearchEntry,
  toSearchParams,
} from "./search.ts"
import { daysUntil, today } from "./format.ts"

const parse = (search: string) =>
  parseQuery(new URLSearchParams(search), { themes: ["tax"] })

const entry = (overrides: Partial<SearchEntry>): SearchEntry => ({
  id: "x",
  kind: "bill",
  title: "",
  href: "/",
  status: "promulgated",
  statusGroup: "enacted",
  themes: [],
  dates: {},
  updatedAt: "2026-01-01",
  text: "",
  ...overrides,
})

test("不正・未知のパラメータは無視する", () => {
  const query = parse(
    "type=foo&status=open&theme=nope&date=x&from=2026-13-40&sort=bad&page=-3&unknown=1"
  )
  assert.deepEqual(query, {
    q: "",
    type: undefined,
    status: "open",
    theme: undefined,
    ministry: undefined,
    date: undefined,
    from: undefined,
    to: undefined,
    sort: "updated",
    page: 1,
  })
})

test("種別と矛盾するステータスは捨てる", () => {
  assert.equal(parse("type=law&status=open").status, undefined)
  assert.equal(parse("type=pc&status=open").status, "open")
})

test("URL への往復で条件が保たれ、既定値・空値は出力しない", () => {
  const search =
    "q=%E7%A8%8E&type=bill&status=enacted&theme=tax&date=promulgated&from=2026-01-01&sort=date-asc&page=2"
  assert.equal(toSearchParams(parse(search)), search)
  assert.equal(toSearchParams(parse("q=&sort=updated&page=1")), "")
})

test("日付条件は日付未確定の項目に一致しない", () => {
  const entries = [
    entry({ id: "a", dates: { enforced: "2026-04-01" } }),
    entry({ id: "b", dates: {} }),
  ]
  const ids = filterEntries(
    entries,
    parse("date=enforced&from=2026-01-01")
  ).map((item) => item.id)
  assert.deepEqual(ids, ["a"])
})

test("日付順では日付未確定を末尾に置く", () => {
  const entries = [
    entry({ id: "none" }),
    entry({ id: "old", dates: { submitted: "2025-01-01" } }),
    entry({ id: "new", dates: { submitted: "2026-01-01" } }),
  ]
  for (const sort of ["date-asc", "date-desc"])
    assert.equal(
      filterEntries(entries, parse(`sort=${sort}`)).at(-1)?.id,
      "none"
    )
})

test("キーワードは全角半角・大小文字を区別せず AND で一致", () => {
  const entries = [entry({ id: "a", text: "個人情報 保護 abc" })]
  assert.equal(filterEntries(entries, parse("q=ＡＢＣ 個人情報")).length, 1)
  assert.equal(filterEntries(entries, parse("q=abc 税")).length, 0)
})

test("今日は JST、日数は日付の差", () => {
  // 2026-10-17T21:30Z = JST 2026-10-18 06:30 (ビルド時刻)
  assert.equal(today(Date.parse("2026-10-17T21:30:00Z")), "2026-10-18")
  assert.equal(daysUntil("2026-11-01", "2026-10-18"), 14)
  assert.equal(daysUntil("2026-10-18", "2026-10-18"), 0)
  assert.equal(daysUntil("2026-10-15", "2026-10-18"), -3)
})
