import { FC } from "react"
import {
  getBillsUnderDeliberation,
  getEnactedBills,
  getOpenPublicComments,
  getRecentlyPromulgatedLaws,
  getRecentlySubmittedBills,
  getUpcomingEnforcementLaws,
} from "lib/data"
import { Section } from "components/elements/section"
import { StatTiles } from "components/elements/stat-tiles"
import { LifecycleGuide } from "components/blocks/lifecycle-guide"
import { BillList } from "components/blocks/bill-list"
import { LawList } from "components/blocks/law-list"
import { PublicCommentList } from "components/blocks/public-comment-list"
import { pageMetadata, siteDescription } from "lib/seo"

const FIRST_VIEW_LIMIT = 5

export const metadata = pageMetadata({
  description: siteDescription,
  path: "/",
})

const Page: FC = () => {
  const submitted = getRecentlySubmittedBills()
  const deliberating = getBillsUnderDeliberation()
  const enacted = getEnactedBills()
  const promulgated = getRecentlyPromulgatedLaws()
  const upcoming = getUpcomingEnforcementLaws()
  const openComments = getOpenPublicComments()
  return (
    <>
      <LifecycleGuide />
      <StatTiles
        stats={[
          {
            label: "新規提出",
            value: submitted.length,
            href: submitted.length > 0 ? "#submitted" : "/bills/",
          },
          {
            label: "審議中",
            value: deliberating.length,
            href: deliberating.length > 0 ? "#deliberating" : "/bills/",
          },
          {
            label: "成立",
            value: enacted.length,
            href: enacted.length > 0 ? "#enacted" : "/bills/",
          },
          {
            label: "公布",
            value: promulgated.length,
            href: promulgated.length > 0 ? "#promulgated" : "/laws/",
          },
          {
            label: "近日施行",
            value: upcoming.length,
            href: upcoming.length > 0 ? "#upcoming" : "/laws/",
          },
          {
            label: "パブコメ募集中",
            value: openComments.length,
            href:
              openComments.length > 0 ? "#public-comments" : "/public-comments/",
          },
        ]}
      />
      {submitted.length > 0 && (
        <Section
          id="submitted"
          title="新しく提出された法案"
          count={submitted.length}
          moreHref="/bills/"
        >
          <BillList bills={submitted.slice(0, FIRST_VIEW_LIMIT)} />
        </Section>
      )}
      {deliberating.length > 0 && (
        <Section
          id="deliberating"
          title="現在審議中の法案"
          count={deliberating.length}
          moreHref="/bills/"
        >
          <BillList bills={deliberating.slice(0, FIRST_VIEW_LIMIT)} />
        </Section>
      )}
      {enacted.length > 0 && (
        <Section
          id="enacted"
          title="成立した法案"
          count={enacted.length}
          moreHref="/bills/"
        >
          <BillList bills={enacted.slice(0, FIRST_VIEW_LIMIT)} />
        </Section>
      )}
      {promulgated.length > 0 && (
        <Section
          id="promulgated"
          title="公布された法令"
          count={promulgated.length}
          moreHref="/laws/"
        >
          <LawList laws={promulgated.slice(0, FIRST_VIEW_LIMIT)} />
        </Section>
      )}
      {upcoming.length > 0 && (
        <Section
          id="upcoming"
          title="近日施行される法令"
          count={upcoming.length}
          moreHref="/laws/"
        >
          <LawList laws={upcoming.slice(0, FIRST_VIEW_LIMIT)} />
        </Section>
      )}
      {openComments.length > 0 && (
        <Section
          id="public-comments"
          title="募集中のパブリックコメント"
          count={openComments.length}
          moreHref="/public-comments/"
        >
          <PublicCommentList
            comments={openComments.slice(0, FIRST_VIEW_LIMIT)}
          />
        </Section>
      )}
    </>
  )
}

export default Page
