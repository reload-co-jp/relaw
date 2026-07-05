import { FC } from "react"
import Link from "next/link"

export interface Stat {
  label: string
  value: number
  href: string
}

export const StatTiles: FC<{ stats: Stat[] }> = ({ stats }) => (
  <div className="stat-grid">
    {stats.map((stat) => (
      <Link key={stat.label} href={stat.href} className="stat-tile">
        <span className="stat-label">{stat.label}</span>
        <span className="stat-value">
          {stat.value}
          <span className="stat-unit">件</span>
        </span>
      </Link>
    ))}
  </div>
)
