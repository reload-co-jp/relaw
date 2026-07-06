import { FC } from "react"

export const JsonLd: FC<{ data: Record<string, unknown> }> = ({ data }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(data).replace(/</g, "\\u003c"),
    }}
  />
)
