import { FC } from "react"

export const Badge: FC<{ label: string; color?: string }> = ({
  label,
  color = "#a09b91",
}) => (
  <span
    className="badge"
    style={{
      backgroundColor: `${color}1a`,
      borderColor: `${color}59`,
      color,
    }}
  >
    {label}
  </span>
)
