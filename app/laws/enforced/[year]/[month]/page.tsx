import { FC } from "react"
import { notFound } from "next/navigation"
import { getLawsByEnforcementMonth } from "lib/data"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs, LinkChips } from "components/elements/breadcrumbs"
import { LawsByType } from "components/blocks/law-list"

type Params = Promise<{ year: string; month: string }>

export const generateStaticParams = () =>
  [...getLawsByEnforcementMonth().keys()].map((key) => {
    const [year, month] = key.split("-")
    return { year, month }
  })

export const generateMetadata = async ({ params }: { params: Params }) => {
  const { year, month } = await params
  const laws = getLawsByEnforcementMonth().get(`${year}-${month}`) ?? []
  return pageMetadata({
    title: `${year}年${Number(month)}月に施行された法令一覧`,
    description: `${year}年${Number(month)}月に施行された法律・政令・省令など${laws.length}件の一覧。各法令の法令番号・公布日・施行日、改正履歴や条文へのリンクを掲載。`,
    path: `/laws/enforced/${year}/${month}/`,
  })
}

const Page: FC<{ params: Params }> = async ({ params }) => {
  const { year, month } = await params
  const groups = getLawsByEnforcementMonth()
  const laws = groups.get(`${year}-${month}`)
  if (!laws) notFound()
  const label = `${year}年${Number(month)}月`
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "法令一覧", path: "/laws/" },
          { name: "施行月別", path: "/laws/enforced/" },
          { name: label, path: `/laws/enforced/${year}/${month}/` },
        ]}
      />
      <h1 className="detail-title">{label}に施行された法令一覧</h1>
      <p className="status-note">
        {label}に施行された法令 {laws.length} 件。
      </p>
      <LinkChips
        links={[...groups.keys()].map((key) => {
          const [y, m] = key.split("-")
          return {
            label: `${y}年${Number(m)}月`,
            href: `/laws/enforced/${y}/${m}/`,
          }
        })}
      />
      <LawsByType laws={laws} />
    </>
  )
}

export default Page
