import { FC } from "react"
import { getPublicComments } from "lib/data"
import { Section } from "components/elements/section"
import { PublicCommentList } from "components/blocks/public-comment-list"
import { SearchForm } from "components/blocks/search-form"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"
import { searchHref } from "lib/search"
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
    <>
      <Breadcrumbs
        items={[{ name: "パブリックコメント", path: "/public-comments/" }]}
      />
      <Section title="パブリックコメント" count={comments.length} titleAs="h1">
        <LinkChips
          links={[
            {
              label: "募集中を締切の近い順に見る",
              href: searchHref({
                type: "pc",
                status: "open",
                sort: "date-asc",
              }),
            },
          ]}
        />
        <SearchForm
          label="パブリックコメントを検索"
          placeholder="案件名・省庁・キーワード"
          type="pc"
        />
        <PublicCommentList comments={comments} />
      </Section>
    </>
  )
}

export default Page
