import { FC } from "react"
import { tones } from "lib/design"

export const Badge: FC<{ label: string; color?: string; title?: string }> = ({
  label,
  color = tones.neutral,
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
