import { FC } from "react"
import { notFound } from "next/navigation"
import { getLawsByPromulgationYear } from "lib/data"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"
import { LawsByType } from "components/blocks/law-list"

export const generateStaticParams = () =>
  [...getLawsByPromulgationYear().keys()].map((year) => ({ year }))

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ year: string }>
}) => {
  const { year } = await params
  const laws = getLawsByPromulgationYear().get(year) ?? []
  return pageMetadata({
    title: `${year}年に公布された法令一覧`,
    description: `${year}年に公布された法律・政令・省令など${laws.length}件の一覧。各法令の法令番号・公布日・施行日、改正履歴や条文へのリンクを掲載。`,
    path: `/laws/enacted/${year}/`,
  })
}

const Page: FC<{ params: Promise<{ year: string }> }> = async ({ params }) => {
  const { year } = await params
  const groups = getLawsByPromulgationYear()
  const laws = groups.get(year)
  if (!laws) notFound()
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "法令一覧", path: "/laws/" },
          { name: "公布年別", path: "/laws/enacted/" },
          { name: `${year}年`, path: `/laws/enacted/${year}/` },
        ]}
      />
      <h1 className="detail-title">{year}年に公布された法令一覧</h1>
      <p className="status-note">
        {year}年に公布された法令 {laws.length} 件（公布日の新しい順）。
      </p>
      <LinkChips
        links={[...groups.keys()].map((item) => ({
          label: `${item}年`,
          href: `/laws/enacted/${item}/`,
        }))}
      />
      <LawsByType laws={laws} />
    </>
  )
}

export default Page
