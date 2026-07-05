import { FC } from "react"
import { getPublicComments } from "lib/data"
import { Section } from "components/elements/section"
import { PublicCommentList } from "components/blocks/public-comment-list"
import { pageMetadata } from "lib/seo"

export const metadata = pageMetadata({
  title: "パブリックコメント",
  description:
    "募集中・結果公示済みのパブリックコメントを一覧で確認。所管府省、募集期間、関連法令、結果ページを追跡できます。",
  path: "/public-comments/",
})

const Page: FC = () => {
  const comments = getPublicComments()
  return (
    <Section title="パブリックコメント" count={comments.length}>
      <PublicCommentList comments={comments} />
    </Section>
  )
}

export default Page
