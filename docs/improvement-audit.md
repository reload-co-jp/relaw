# Relaw 改善 事前調査 (Phase 0)

調査日: 2026-10-18 / 対象コミット: `14504e7`

## 1. 現状の構成

- フレームワーク: Next.js 16 (App Router) / React 19 / TypeScript 6、pnpm 11、Node 24
- 出力: `output: "export"` + `trailingSlash: true` の完全静的サイト。GitHub Pages へデプロイ
- 依存: `next` `react` `react-dom` のみ。UI・チャート・CSS-in-JS ライブラリなし
- スタイル: `app/theme.css` (グローバル CSS 947 行, ダークテーマ, CSS 変数) + `app/reset.css` + 一部 inline `style`
  - CSS-in-JS ライブラリ未導入。Tailwind 未使用
- テスト: なし (テストランナー未導入)。CI は `lint.yml` (eslint + prettier) と `deploy.yml` (build → Pages)

### 処理フロー

```
scripts/collect/*.ts (毎日 JST 06:00, collect.yml)
  → data/*.json をコミット (GITHUB_TOKEN で push)
  → (deploy.yml: main への push で build → Pages)
Next.js build: lib/data.ts が data/*.json を読み、全ページを SSG
```

### ページ実装場所

- トップ: `app/page.tsx` (統計タイル + 各セクション 5 件 + `SiteSearch`)
- 検索: `components/blocks/site-search.tsx` (トップ, 全件クライアント絞り込み)、`bill-search-list.tsx` (`/bills/`)
- 法案詳細 + 国会回次一覧: `app/bills/[id]/page.tsx` (`/bills/{id}/` と `/bills/{回次}/` を同居)
- 法令詳細: `app/laws/[id]/page.tsx`
- パブコメ: `app/public-comments/page.tsx` (詳細ページなし、外部 e-Gov へリンク)
- ガント: `app/gantt/page.tsx` (サーバー描画のみ, CSS の % 配置)
- テーマ: `app/themes/`、法令の年/月別: `app/laws/enacted|enforced|upcoming/`
- SEO: `lib/seo.ts` (`pageMetadata`, JSON-LD), `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`

### データモデル (`lib/types.ts`)

- `Bill` 215 件: status は `promulgated` 93 / `expired` 84 / `committee_review` 35 / `rejected` 2 / `passed_diet` 1
  - `ministry` 0 件, `category` 0 件, `enforcedAt` 0 件 (法案側に施行日なし)
  - `summary` (参議院 議案要旨) 94 件
- `BillEvent` 1182 件 (提出・付託・委員会可決・両院可決・成立・公布・継続・廃案等。日付は参議院明細由来)
- `Law` 317 件 (法律 24 / 政令 90 / 省令 189 / 規則 14): `enforcedAt` は laws.json に無く、`law-versions.json` の制定時版から導出 (`lib/data.ts withEnforcement`)
- `LawVersion` 335 件: 改正法令番号・題名・公布日・施行日。法案 → 改正対象法令の施行日はここからのみ得られる
- `Document` 887 件 (参議院・内閣官房・官報・会議録へのリンク)
- `PublicComment` 351 件: `ministry` 312, `startAt`/`endAt` 全件, `resultUrl` 0 件
- 関連付け (`lib/relations.ts`): 制定文の法令番号 (根拠法令)、e-Gov 改正履歴 (改正法令)、題名+公布日一致 (法案→法令)。推測なしの方針が既にある
- テーマ (`lib/themes.ts`): 題名キーワード一致による 9 テーマ

## 2. 再利用できるもの

- `lib/labels.ts`: ステータス・イベントのラベル/平易な説明/色 (色は値のみ差し替えで全画面に反映)
- `lib/relations.ts`: 関連法令グラフの根拠データとしてそのまま使える (関係の種類と根拠が明確)
- `lib/overview.ts`: 公的データの値だけで組み立てた概要文 (サイト独自要約として区別表示する)
- `EntryList` / `Badge` / `Section` / `Breadcrumbs` / `StageFlow` / `JsonLd`
- `lib/seo.ts` の `pageMetadata` (canonical, OGP は既に全ページ設定済み)

## 3. 課題と根拠

| #   | 課題                                         | 根拠                                                                                                                                 |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | パブコメの募集状況が古い                     | 351 件中 339 件が `open` だが `endAt` 経過済みが多数 (例 `pc-050202606` endAt 2026-10-15)。表示時に締切日で再判定していない          |
| 2   | 日付計算が UTC                               | `today()` が `toISOString()` (UTC)。ビルドは JST 06:00 = UTC 前日 21:00 のため「今日」が 1 日ずれる。`daysFromToday` も UTC 0 時基準 |
| 3   | データ更新がデプロイされない                 | collect.yml は `GITHUB_TOKEN` で push → 他ワークフローを起動しない。deploy の最終実行 2026-10-02 (collect は毎日成功)                |
| 4   | トップページが重い                           | `out/index.html` 1.36MB。全法案・法令・パブコメを検索用に props で埋め込み。`/bills/` も 0.97MB                                      |
| 5   | 検索条件が URL に残らない                    | `useState` のみ。共有・戻る・再読込で消える。ステータス/テーマ/省庁/日付の絞り込みなし                                               |
| 6   | トップの件数と遷移先の不一致                 | 例: 「近日施行」は 60 日以内の件数だが遷移先 `/laws/` は全法令                                                                       |
| 7   | 近日施行に残日数なし、パブコメが締切順でない | `app/page.tsx`                                                                                                                       |
| 8   | 詳細ページで出典と独自要約の区別が弱い       | 概要文 (自動生成) と議案要旨 (参議院原文) が同じパネル                                                                               |
| 9   | 法案の施行日が常に空                         | `Bill.enforcedAt` 0 件。改正法の施行日は `LawVersion` にあるが法案ページに出ていない                                                 |
| 10  | 変更履歴なし                                 | 収集時に差分を保存していない (Git 履歴のみ)                                                                                          |
| 11  | ガントの日付未確定区間                       | 公布後・施行日不明の帯を「今日」まで描画 (確定区間と同じ見た目)。絞り込み・期間変更・モバイル代替なし                                |
| 12  | sitemap の lastModified が現在時刻           | 固定・一覧ルートが `new Date()`                                                                                                      |
| 13  | テーマ別 RSS・ウォッチリストなし             | —                                                                                                                                    |
| 14  | ダークテーマ                                 | 「白または淡いニュートラル基調」の要件と不一致。ステータス色は暗背景前提の淡色                                                       |
| 15  | a11y                                         | ガントの帯は `title` 属性のみ (キーボード・タッチ不可)。ヘルプは hover の `title` 依存                                               |

## 4. 制約 (データ不足・外部依存)

- 法案の所管省庁・カテゴリ・対象者データなし → 法案の省庁絞り込み・対象者表示は不可。省庁はパブコメ (`ministry`) と省令等 (法令番号の制定機関) のみ
- 法案の施行日は、改正対象法令の版 (`LawVersion.enforcedAt`) と題名+公布日で一致した場合のみ取得可能。それ以外は「未確認」
- 「次の手続き」の確定情報源は施行予定日 (e-Gov 版データ) のみ。国会の審議予定は収集していないため表示しない
- 変更履歴は今回の実装以降の収集分から記録。過去分は作らない
- 静的ホスティング (GitHub Pages) のため Content-Type はファイル拡張子で決まる (RSS は `application/xml` で配信される)。サーバー同期・通知は不可 → ウォッチリストはブラウザ保存
- 日数表示 (「あと N 日」) はビルド時点で計算 → デプロイを毎日実行し、クライアントでも再計算する

## 5. CSS 方針

- 新規ライブラリは導入しない。React 19 の `<style href precedence>` (サーバーコンポーネントで動作、`<head>` へ巻き上げ・重複排除) でコンポーネント単位の CSS を TS に同居させる
- デザイントークン (色・余白・文字・罫線・角丸・ステータス色) は `lib/design.ts` に集約し、CSS 変数として出力。既存 `theme.css` は変数経由で追従させ、行数を増やさない
- 変更したコンポーネントから順に `theme.css` のスタイルを移す

## 6. 変更対象ファイル

- `lib/data.ts` (JST 日付, パブコメ状態再判定), `lib/labels.ts` (色・状態グループ), `lib/design.ts` (新規)
- `lib/lifecycle.ts` (新規: 法案・法令のマイルストーン導出。詳細タイムラインとガントで共有)
- `lib/search.ts` (新規: 検索条件のパース/シリアライズ/絞り込み。トップの件数・検索ページ・ガントで共有)
- `app/page.tsx`, `app/bills/[id]/page.tsx`, `app/laws/[id]/page.tsx`, `app/gantt/page.tsx`
- `app/search/` (新規), `app/search-index.json/route.ts` (新規), `app/themes/[slug]/rss.xml/route.ts` (新規), `app/watchlist/` (新規)
- `app/sitemap.ts`, `app/layout.tsx`, `.github/workflows/deploy.yml`
- `scripts/collect/index.ts` (変更履歴の記録)

## 7. 実装順序とリスク

1. 基盤: JST 日付・パブコメ状態・トークン/ライトテーマ (全ページの見た目に影響 → 主要ページを目視確認)
2. トップ・詳細 (既存 URL 維持)
3. 検索 `/search/` (静的 JSON を取得してクライアントで絞り込み。インデックスサイズに注意)
4. ガント (クライアント化による JS 増に注意)
5. SEO (検索ページは noindex)
6. グラフ・RSS・ウォッチリスト

## 8. ベースライン (変更前)

- `pnpm typecheck`: 成功 / `pnpm lint`: 成功 / `pnpm build`: 成功 (約 16 秒)
- テスト: 存在しない
- 出力: `out/` 127MB, `index.html` 1.36MB, `bills/index.html` 0.97MB, `public-comments/index.html` 0.71MB
