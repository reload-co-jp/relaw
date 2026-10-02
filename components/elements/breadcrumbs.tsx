import { FC, Fragment } from "react"
import Link from "next/link"
import { breadcrumbJsonLd, webPageJsonLd } from "lib/seo"
import { JsonLd } from "components/elements/json-ld"

export interface Crumb {
  name: string
  path: string
}

/** パンくず (表示 + BreadcrumbList) と、末尾ページの WebPage JSON-LD を出力する */
export const Breadcrumbs: FC<{ items: Crumb[]; description?: string }> = ({
  items,
  description,
}) => {
  const all = [{ name: "ホーム", path: "/" }, ...items]
  const current = all[all.length - 1]
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(all)} />
      <JsonLd
        data={webPageJsonLd({
          name: current.name,
          path: current.path,
          description,
        })}
      />
      <nav aria-label="パンくずリスト" className="breadcrumbs">
        {all.map((item, index) => (
          <Fragment key={item.path}>
            {index > 0 && <span aria-hidden="true"> / </span>}
            {index === all.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.path}>{item.name}</Link>
            )}
          </Fragment>
        ))}
      </nav>
    </>
  )
}

/** 一覧ページ間の内部リンク */
export const LinkChips: FC<{ links: { label: string; href: string }[] }> = ({
  links,
}) => (
  <ul className="link-chips">
    {links.map((link) => (
      <li key={link.href}>
        <Link href={link.href}>{link.label}</Link>
      </li>
    ))}
  </ul>
)
