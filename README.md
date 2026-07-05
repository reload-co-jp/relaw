# Relaw

法案・法令ライフサイクルモニタリングシステム

## 1. Product

Relaw は、日本の法案・法令の状態変化を、公的情報源から収集・正規化し、検索・閲覧できる Web サービスである。

対象は以下。

- 法案の提出・審議・修正・可決・成立
- 法律・政令・省令の公布・施行・改正・廃止
- パブリックコメントの募集・結果公表
- 法案資料、概要、要綱、新旧対照表、本文 PDF

## 2. Goal

ユーザーが以下を簡単に把握できる状態を作る。

- 新しく提出された法案
- 現在審議中の法案
- 成立した法案
- 公布された法律・政令・省令
- 近日施行される法令
- 法案ごとの時系列イベント (提出・委員会付託・委員会議決・本会議可決・成立・公布・施行)
- 法案の議案要旨 (概要)
- 関連資料への公式リンク

政治に詳しくないユーザーでも読めることを重視し、ステータス・用語には平易な説明を付ける。

## 3. Non-goals

初期版では以下を行わない。

- 法律相談
- 法的判断の自動提供
- 判例検索
- 自治体条例の網羅
- 全省庁ガイドラインの完全収集
- LLM による自動解釈を主要機能にすること

## 4. Architecture

データベースを持たない。データソースは、収集バッチが生成する静的な JSON ファイルとする。

```
収集バッチ (クローラー / API クライアント)
        ↓ 生成
data/*.json (静的 JSON、リポジトリにコミット)
        ↓ ビルド時に読み込み
Next.js (SSG) → 静的サイトとして配信
```

- 収集バッチは各情報源を巡回し、正規化した結果を `data/` 配下の JSON に書き出す
- JSON はリポジトリにコミットし、変更履歴を Git で管理する
- Web アプリは Next.js の静的生成 (SSG) でビルド時に JSON を読み込む
- JSON 更新のたびに再ビルド・再デプロイする

## 5. Pages / UI

| Path | 内容 |
| --- | --- |
| `/` | ダッシュボード。サマリー統計タイル (新規提出・審議中・成立・公布・近日施行・パブコメ募集中)、各セクション最新 5 件 + 一覧へのリンク |
| `/bills/` | 法案一覧 (最終更新順) |
| `/bills/[id]/` | 法案詳細。ステータスステッパー、基本情報、議案要旨、時系列イベント、関連資料 |
| `/gantt/` | 法案ガントチャート。提出→成立→公布→施行のフェーズを月軸で帯表示 |
| `/laws/` | 法令一覧 (最終更新順) |
| `/laws/[id]/` | 法令詳細。基本情報、版・改正履歴、関連資料、関連法案 |
| `/public-comments/` | パブリックコメント一覧 (最終更新順) |

UI の共通仕様。

- 一覧は共通の `EntryList` カードで統一 (バッジ + タイトル + 要約 2 行 + メタ情報 + 関連リンク)。カード全面がリンク領域
- 一覧のソートは `updatedAt` 降順 (最新更新順)
- 法案にはライフサイクルステッパー (提出 → 審議 → 成立 → 公布 → 施行) を表示。詳細ページはラベル付き、カードはコンパクトなセグメント表示
- ステータスバッジ・時系列イベント用語にはホバーで平易な説明を表示。詳細ページには現在状態の説明文を常時表示
- トップとガントページに折りたたみ式の入門ガイド「法案が法律になるまで」を設置
- ガントチャートの配色はコントラスト・色覚多様性を検証済みのパレットを使用

## 6. Data Layout

`data/` 配下に以下の JSON を置く。

```
data/
├── bills.json          # 法案一覧 (Bill[])
├── bill-events.json    # 法案の時系列イベント (BillEvent[])
├── laws.json           # 法令一覧 (Law[])
├── law-versions.json   # 法令の版・改正履歴 (LawVersion[])
├── documents.json      # 法案資料・PDF へのリンク (Document[])
└── public-comments.json # パブリックコメント (PublicComment[])
```

- 各ファイルはエンティティの配列を持つ単一 JSON
- ID による参照でエンティティ間を紐付ける (例: `BillEvent.billId` → `Bill.id`)
- 本文 PDF などのバイナリは保存せず、公式 URL への参照のみ持つ

## 7. Data Sources

### 7.1 e-Gov 法令検索 API

- 現行法令の法令番号・法令名・公布日・施行日
- 取得結果を `laws.json` と `law-versions.json` に書き出す

### 7.2 官報

- 法律・政令・省令の公布、施行期日政令、廃止情報
- 公開ページを毎日巡回し、法令名・法令番号・公布日を抽出する
- 抽出できない場合も raw エントリとして `documents.json` に残す

### 7.3 内閣官房 国会提出法案

- 内閣提出法案の資料 (本文・理由・概要・要綱・新旧対照表・参照条文)
- 国会回次ごとのページを巡回し、法案単位で資料 URL を `documents.json` に書き出す
- 未知の法案は `bills.json` にエントリを作成する

### 7.4 衆議院 議案情報

- 国会回次ごとの議案一覧から、提出法案・議案番号・審議状況を取得する
- 法案名と議案番号で `bills.json` の既存エントリと突合する
- 状態変更を `bill-events.json` に追記する。日付は収集日となる暫定イベントのため、参議院明細から正確な日付のイベントが得られている種別 (提出・委員会付託・衆議院通過・成立) は生成しない

### 7.5 参議院 議案情報

議案明細ページを法案ごとに巡回し、最も詳細な審議経過を抽出する。

- 提出日 (`Bill.submittedAt` + 提出イベント)
- 両院の委員会経過: 本付託日・付託委員会名・議決日・議決結果 (可決 / 修正 / 継続審査 / 否決)
- 両院の本会議経過: 議決日・議決結果・採決方法 (押しボタン / 起立 など)
- 成立日 (後議院の可決日)・公布日・法律番号
- 議案要旨 (`Bill.summary`)

衆議院側が作成した収集日付の暫定イベントは、正確な日付のイベントで自動置換する。

### 7.6 e-Gov パブリックコメント

- 意見募集の開始・終了・結果公表
- 新着一覧を巡回し、案件名・省庁・募集期間・結果 URL を `public-comments.json` に書き出す
- 法案・法令と名称類似で紐付ける

## 8. Update Frequency

| Source                   | Frequency |
| ------------------------ | --------- |
| 官報                     | daily     |
| 内閣官房                 | daily     |
| 衆議院                   | daily     |
| 参議院                   | daily     |
| e-Gov 法令 API           | daily     |
| e-Gov パブリックコメント | daily     |

デフォルト実行時刻は JST 06:00。バッチ実行 → JSON 更新 → 再ビルド・デプロイまでを 1 サイクルとする。

## 9. Development

```sh
pnpm install
pnpm collect    # 収集バッチを実行し data/*.json を更新 (Node 24, 追加依存なし)
pnpm dev        # 開発サーバー
pnpm build      # 静的サイトを out/ に生成
pnpm lint
pnpm typecheck
```

- 収集対象の国会回次は `COLLECT_SESSIONS` (カンマ区切り) で指定する。デフォルトは `scripts/collect/config.ts` を参照
- e-Gov 法令 API の取得範囲は `COLLECT_LAW_WINDOW_DAYS` (公布日の下限、デフォルト 730 日) で指定する
- `.github/workflows/collect.yml` が毎日 JST 06:00 に収集バッチを実行し、`data/` の差分を main にコミットする。push を契機に GitHub Pages へ再デプロイされる

主なディレクトリ構成。

```
app/                  # Next.js App Router (SSG)
├── page.tsx          # ダッシュボード
├── bills/            # 法案一覧・詳細
├── gantt/            # ガントチャート
├── laws/             # 法令一覧・詳細
└── public-comments/  # パブリックコメント一覧
components/
├── blocks/           # EntryList と種別ごとの変換 (bill/law/public-comment)、入門ガイド
└── elements/         # Badge・Section・StatTiles・StageProgress など
lib/
├── data.ts           # data/*.json の読み込み・ソート・絞り込み
├── labels.ts         # ラベル・配色・平易な説明文・ライフサイクル段階
└── types.ts          # エンティティ型定義
scripts/collect/      # 収集バッチ (情報源ごとに 1 ファイル)
```

## 10. Core Entities

### 10.1 Bill

法案を表す。`data/bills.json` に配列で保存する。

```ts
type BillStatus =
  | "draft"
  | "public_comment"
  | "submitted"
  | "committee_review"
  | "passed_lower_house"
  | "passed_upper_house"
  | "passed_diet"
  | "promulgated"
  | "enforced"
  | "withdrawn"
  | "rejected"
  | "expired"
  | "unknown"

interface Bill {
  id: string
  title: string
  titleKana?: string
  billNumber?: string
  dietSession?: number
  proposerType?: "cabinet" | "representative" | "councillor" | "unknown"
  proposerName?: string
  ministry?: string
  category?: string
  status: BillStatus
  summary?: string // 議案要旨 (参議院明細ページ由来)
  submittedAt?: string
  passedLowerHouseAt?: string
  passedUpperHouseAt?: string
  enactedAt?: string
  promulgatedAt?: string
  enforcedAt?: string
  sourceUrl?: string
  createdAt: string
  updatedAt: string
}
```

そのほかのエンティティ (`BillEvent` / `Law` / `LawVersion` / `Document` / `PublicComment`) は `lib/types.ts` を参照。
