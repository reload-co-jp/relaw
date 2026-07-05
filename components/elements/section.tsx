import { FC, ReactNode } from "react"

export const Section: FC<{
  title: string
  count?: number
  children: ReactNode
}> = ({ title, count, children }) => (
  <section className="section">
    <div className="section-header">
      <h2 className="section-title">{title}</h2>
      {count !== undefined && <span className="section-count">{count} 件</span>}
    </div>
    {children}
  </section>
)

export const EmptyMessage: FC<{ children: ReactNode }> = ({ children }) => (
  <p className="empty-message">{children}</p>
)
