import { ComponentProps, FC } from "react"

export const Title: FC<ComponentProps<"h1">> = ({
  style,
  children,
  ...props
}) => (
  <h1 style={{ fontSize: "1rem", margin: 0, ...style }} {...props}>
    {children}
  </h1>
)
