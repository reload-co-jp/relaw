import { FC } from "react"
import { getPublicComments } from "lib/data"
import { Section } from "components/elements/section"
import { PublicCommentList } from "components/blocks/public-comment-list"

export const metadata = {
  title: "パブリックコメント | Relaw",
}

const Page: FC = () => {
  const comments = getPublicComments()
  return (
    <Section title="パブリックコメント" count={comments.length}>
      <PublicCommentList comments={comments} />
    </Section>
  )
}

export default Page
