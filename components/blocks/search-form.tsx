import { FC } from "react"
import type { SearchKind } from "lib/search"

const css = `
.quick-search{display:flex;gap:.5rem;margin:0 0 1.5rem}
.quick-search input{background:var(--surface);border:1px solid var(--line-strong);border-radius:var(--radius);color:var(--text);flex:1;font-size:1rem;min-height:2.75rem;min-width:0;padding:.5rem .75rem}
.quick-search button{background:var(--accent);border:0;border-radius:var(--radius);color:#fff;cursor:pointer;font-size:.9375rem;font-weight:600;padding:0 1.25rem}
.quick-search button:hover{background:var(--accent-strong)}
`

/** /search/ への GET フォーム (JavaScript なしでも動作する) */
export const SearchForm: FC<{
  label: string
  placeholder?: string
  type?: SearchKind
}> = ({ label, placeholder = "法案名・法令名・キーワード", type }) => (
  <>
    <style href="search-form" precedence="component">
      {css}
    </style>
    <form action="/search/" method="get" role="search" className="quick-search">
      <label
        htmlFor={`quick-search-${type ?? "all"}`}
        className="visually-hidden"
      >
        {label}
      </label>
      <input
        id={`quick-search-${type ?? "all"}`}
        type="search"
        name="q"
        placeholder={placeholder}
        autoComplete="off"
      />
      {type && <input type="hidden" name="type" value={type} />}
      <button type="submit">検索</button>
    </form>
  </>
)
