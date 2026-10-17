import { FC } from "react"
import Link from "next/link"

export interface RelationNode {
  id: string
  title: string
  href: string
  note?: string
}

export interface RelationGroup {
  /** 関係の種類 (例: 根拠法令) */
  relation: string
  /** 関係の根拠 (どの公的データで確認したか) */
  basis: string
  /** in: この法令・法案の上流 (根拠・前身)、out: 下流 (委任・改正先) */
  side: "in" | "out"
  nodes: RelationNode[]
}

const css = `
.rg{align-items:center;display:grid;gap:1rem 2.5rem;grid-template-columns:minmax(0,1fr) minmax(10rem,14rem) minmax(0,1fr);margin:0 0 .5rem}
.rg-side{display:grid;gap:1rem}
.rg-center{background:var(--accent);border-radius:var(--radius-lg);color:#fff;font-weight:700;padding:.75rem 1rem;position:relative;text-align:center}
.rg-center small{display:block;font-size:.6875rem;font-weight:400;opacity:.85}
.rg-group{border:1px solid var(--line);border-radius:var(--radius-lg);margin:0;padding:.625rem .875rem;position:relative}
.rg-group::after{border-top:2px solid var(--line-strong);content:"";position:absolute;top:50%;width:2.5rem}
.rg-side[data-side=in] .rg-group::after{right:-2.5rem}
.rg-side[data-side=out] .rg-group::after{left:-2.5rem}
.rg-relation{color:var(--accent-strong);font-size:.75rem;font-weight:700}
.rg-basis{color:var(--text-faint);font-size:.6875rem;margin:0 0 .375rem}
.rg-group ul{display:grid;gap:.25rem;list-style:none;margin:0;padding:0}
.rg-group li{font-size:.8125rem;line-height:1.5}
.rg-note{color:var(--text-faint);display:block;font-size:.6875rem}
@media (max-width:48rem){.rg{grid-template-columns:minmax(0,1fr)}.rg-group::after{display:none}.rg-side[data-side=in]{order:-1}}
`

/**
 * 法案・法令の関連図。公的データで根拠を確認できた関係だけを、関係の種類と根拠付きで表示する。
 * ノードは詳細ページへのリンク。
 */
export const RelationGraph: FC<{
  center: { label: string; kind: string }
  groups: RelationGroup[]
}> = ({ center, groups }) => {
  const visible = groups.filter((group) => group.nodes.length > 0)
  if (visible.length === 0) return null
  const side = (name: RelationGroup["side"]) => (
    <div className="rg-side" data-side={name}>
      {visible
        .filter((group) => group.side === name)
        .map((group) => (
          <section key={group.relation} className="rg-group">
            <h3 className="rg-relation">{group.relation}</h3>
            <p className="rg-basis">根拠: {group.basis}</p>
            <ul>
              {group.nodes.map((node) => (
                <li key={node.id}>
                  <Link href={node.href} className="text-link">
                    {node.title}
                  </Link>
                  {node.note && <span className="rg-note">{node.note}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
  return (
    <>
      <style href="relation-graph" precedence="component">
        {css}
      </style>
      <div className="rg" role="group" aria-label="関連する法案・法令の関係図">
        {side("in")}
        <div className="rg-center">
          <small>{center.kind}</small>
          {center.label}
        </div>
        {side("out")}
      </div>
    </>
  )
}
