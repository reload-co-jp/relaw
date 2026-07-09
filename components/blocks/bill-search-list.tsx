"use client"

import { FC, useMemo, useState } from "react"
import { EntryList } from "components/blocks/entry-list"
import type { Entry } from "components/blocks/entry-list"

export type SearchableBillEntry = Entry & { searchText: string }

const normalizeQuery = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase()

export const BillSearchList: FC<{ entries: SearchableBillEntry[] }> = ({
  entries,
}) => {
  const [query, setQuery] = useState("")
  const normalizedQuery = normalizeQuery(query)
  const filteredEntries = useMemo(() => {
    const terms = normalizedQuery ? normalizedQuery.split(" ") : []
    if (terms.length === 0) return entries
    return entries.filter((entry) => {
      const target = entry.searchText.toLowerCase()
      return terms.every((term) => target.includes(term))
    })
  }, [entries, normalizedQuery])

  return (
    <>
      <div className="search-panel">
        <label className="search-label" htmlFor="bill-search">
          法案検索
        </label>
        <input
          id="bill-search"
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="法案名・議案番号・所管・ステータス"
          autoComplete="off"
        />
        <span className="search-count">
          {filteredEntries.length} / {entries.length} 件
        </span>
      </div>
      <EntryList entries={filteredEntries} />
    </>
  )
}
