import { FC } from "react"
import { pageMetadata } from "lib/seo"
import { Breadcrumbs } from "components/elements/breadcrumbs"
import { WatchlistView } from "components/blocks/watchlist-view"

export const metadata = {
  ...pageMetadata({
    title: "ウォッチリスト",
    description:
      "気になる法案・法令・テーマを登録して、現在のステータスをまとめて確認できます。",
    path: "/watchlist/",
  }),
  // 閲覧者ごとに内容が変わる (ブラウザ保存) ため、インデックス不要
  robots: { index: false, follow: true },
}

const Page: FC = () => (
  <>
    <Breadcrumbs items={[{ name: "ウォッチリスト", path: "/watchlist/" }]} />
    <h1 className="detail-title">ウォッチリスト</h1>
    <p className="status-note">
      登録内容はこのブラウザ内（localStorage）にのみ保存されます。ほかの端末・ブラウザとは同期されず、ブラウザのデータを消去すると失われます。通知機能はありません。
    </p>
    <WatchlistView />
  </>
)

export default Page
