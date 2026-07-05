import { FC } from "react"

export const Badge: FC<{ label: string; color?: string; title?: string }> = ({
  label,
  color = "#a09b91",
  title,
}) => (
  <span
    className={title ? "badge badge-help" : "badge"}
    title={title}
    style={{
      backgroundColor: `${color}1a`,
      borderColor: `${color}59`,
      color,
    }}
  >
    {label}
  </span>
)
