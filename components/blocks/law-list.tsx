import { FC } from "react"
import type { Law } from "lib/types"
import {
  lawStatusColors,
  lawStatusLabels,
  lawTypeColor,
  lawTypeLabels,
} from "lib/labels"
import { Entry, EntryList } from "components/blocks/entry-list"

export const lawEntry = (law: Law): Entry => ({
  id: law.id,
  title: law.title,
  href: `/laws/${law.id}/`,
  badges: [
    { label: lawTypeLabels[law.lawType], color: lawTypeColor },
    { label: lawStatusLabels[law.status], color: lawStatusColors[law.status] },
  ],
  meta: [
    law.lawNumber,
    law.promulgatedAt && `公布 ${law.promulgatedAt}`,
    law.enforcedAt && `施行 ${law.enforcedAt}`,
  ].filter(Boolean) as string[],
})

export const LawList: FC<{ laws: Law[] }> = ({ laws }) => (
  <EntryList entries={laws.map(lawEntry)} />
)
