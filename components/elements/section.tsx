import { FC, ReactNode } from "react"
import Link from "next/link"

export const Section: FC<{
  title: string
  count?: number
  id?: string
  moreHref?: string
  children: ReactNode
}> = ({ title, count, id, moreHref, children }) => (
  <section className="section" id={id}>
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {count !== undefined && <span className="section-count">{count} 件</span>}
      {moreHref && (
        <Link href={moreHref} className="section-more">
          すべて見る →
        </Link>
      )}
    </div>
    {children}
  </section>
)

export const EmptyMessage: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="empty-message">{children}</p>
)
