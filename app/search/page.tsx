import { FC, Suspense } from "react"
import { today } from "lib/data"
import { pageMetadata } from "lib/seo"
import { getSearchMinistries } from "lib/search-index"
import { themes } from "lib/themes"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { SearchApp } from "components/blocks/search-app"

export const metadata = {
  ...pageMetadata({
    title: "検索",
    description:
      "法案・法令・パブリックコメントをキーワード、ステータス、テーマ、所管、提出日・公布日・施行日・締切日で絞り込み検索。",
    path: "/search/",
  }),
  // 検索条件の組み合わせで無数の URL ができるため、インデックスさせない (リンクはたどらせる)
  robots: { index: false, follow: true },
}

const Page: FC = () => (
  <>
    <Breadcrumbs items={[{ name: "検索", path: "/search/" }]} />
    <h1 className="detail-title">法案・法令・パブリックコメントを検索</h1>
    <Suspense fallback={<p>検索フォームを読み込み中…</p>}>
      <SearchApp
        themes={themes}
        ministries={getSearchMinistries()}
        builtOn={today()}
      />
    </Suspense>
  </>
)

export default Page
