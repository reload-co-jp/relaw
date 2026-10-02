import { FC } from "react"
import Link from "next/link"
import type { Law } from "lib/types"
import {
  lawStatusColors,
  lawStatusDescriptions,
  lawStatusLabels,
  lawTypeColor,
  lawTypeLabels,
} from "lib/labels"
import { Entry, EntryList } from "components/blocks/entry-list"
import { Section } from "components/elements/section"

export const lawSearchText = (law: Law): string =>
  [
    law.id,
    law.title,
    law.titleKana,
    law.lawNumber,
    lawTypeLabels[law.lawType],
    lawStatusLabels[law.status],
    lawStatusDescriptions[law.status],
    law.promulgatedAt,
    law.enforcedAt,
    law.repealedAt,
  ]
    .filter(Boolean)
    .join(" ")

export const lawEntry = (law: Law): Entry => ({
  id: law.id,
  title: law.title,
  href: `/laws/${law.id}/`,
  badges: [
    { label: lawTypeLabels[law.lawType], color: lawTypeColor },
    {
      label: lawStatusLabels[law.status],
      color: lawStatusColors[law.status],
      title: lawStatusDescriptions[law.status],
    },
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

export const LawLinkList: FC<{ heading: string; laws: Law[] }> = ({
  heading,
  laws,
}) =>
  laws.length === 0 ? null : (
    <>
      <h3 className="related-heading">{heading}</h3>
      <ul className="document-list">
        {laws.map((law) => (
          <li key={law.id}>
            <Link href={`/laws/${law.id}/`} className="text-link">
              {law.title}
            </Link>
            <span className="document-note">
              {[lawTypeLabels[law.lawType], law.lawNumber]
                .filter(Boolean)
                .join(" / ")}
            </span>
          </li>
        ))}
      </ul>
    </>
  )

const lawTypeOrder: Law["lawType"][] = [
  "constitution",
  "act",
  "cabinet_order",
  "imperial_order",
  "ministerial_ordinance",
  "rule",
  "other",
]

/** 法令種別ごとに見出しを分けた一覧 (一覧ページ用) */
export const LawsByType: FC<{ laws: Law[]; suffix?: string }> = ({
  laws,
  suffix = "",
}) =>
  lawTypeOrder.map((type) => {
    const group = laws.filter((law) => law.lawType === type)
    if (group.length === 0) return null
    return (
      <Section
        key={type}
        title={`${lawTypeLabels[type]}${suffix}`}
        count={group.length}
      >
        <LawList laws={group} />
      </Section>
    )
  })
