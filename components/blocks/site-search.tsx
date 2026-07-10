"use client"

import { FC, useMemo, useState } from "react"
import { EntryList } from "components/blocks/entry-list"
import type { Entry } from "components/blocks/entry-list"
import { searchEntryKindColors, searchEntryKindLabels } from "lib/labels"

type SearchEntryKind = keyof typeof searchEntryKindLabels

export type SiteSearchEntry = Entry & {
  searchText: string
  kind: SearchEntryKind
}

const RESULT_LIMIT = 20

const normalizeQuery = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase()

export const SiteSearch: FC<{ entries: SiteSearchEntry[] }> = ({
  entries,
}) => {
  const [query, setQuery] = useState("")
  const normalizedQuery = normalizeQuery(query)
  const filteredEntries = useMemo(() => {
    const terms = normalizedQuery ? normalizedQuery.split(" ") : []
    if (terms.length === 0) return []
    return entries
      .filter((entry) => {
        const target = entry.searchText.toLowerCase()
        return terms.every((term) => target.includes(term))
      })
      .map((entry) => ({
        ...entry,
        badges: [
          {
            label: searchEntryKindLabels[entry.kind],
            color: searchEntryKindColors[entry.kind],
          },
          ...entry.badges,
        ],
      }))
  }, [entries, normalizedQuery])

  return (
    <div className="search-panel-wrap">
      <div className="search-panel">
        <label className="search-label" htmlFor="site-search">
          法案・法令・パブリックコメントを検索
        </label>
        <input
          id="site-search"
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="法案名・法令名・キーワード"
          autoComplete="off"
        />
        {normalizedQuery && (
          <span className="search-count">{filteredEntries.length} 件</span>
        )}
      </div>
      {normalizedQuery && (
        <EntryList entries={filteredEntries.slice(0, RESULT_LIMIT)} />
      )}
    </div>
  )
}
