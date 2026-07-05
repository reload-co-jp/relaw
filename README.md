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
- 法案ごとの時系列イベント
- 法令改正の差分
- 関連資料への公式リンク

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

## 5. Data Layout

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

## 6. Data Sources

### 6.1 e-Gov 法令検索 API

- 現行法令本文
- 法令番号
- 法令名
- 施行日
- 改正履歴
- 条文取得

- API クライアントを作成する
- 取得結果を `laws.json` と `law-versions.json` に書き出す

### 6.2 官報

- 法律公布
- 政令公布
- 省令公布
- 施行期日政令
- 廃止情報

- 官報の公開ページを毎日巡回する
- HTML または PDF から法令名、法令番号、公布日を抽出する
- 抽出できない場合も raw エントリとして `documents.json` に残す

### 6.3 内閣官房 国会提出法案

- 内閣提出法案
- 法律案本文
- 理由
- 概要
- 要綱
- 新旧対照表
- 参照条文

- 国会回次ごとのページを巡回する
- 法案単位で資料 URL を `documents.json` に書き出す

### 6.4 衆議院 議案情報

- 提出法案
- 議案番号
- 提出日
- 審議経過
- 修正案
- 衆議院通過状況

- 国会回次ごとの議案一覧を巡回する
- 法案名と議案番号で `bills.json` の既存エントリと突合する
- 状態変更を `bill-events.json` に追加する

### 6.5 参議院 議案情報

- 参議院での審議状況
- 可決状況
- 否決
- 継続審査
- 廃案

- 国会回次ごとの議案一覧を巡回する
- 衆議院側のデータと統合する
- 状態変更を `bill-events.json` に追加する

### 6.6 e-Gov パブリックコメント

- 意見募集開始
- 意見募集終了
- 結果公表
- 関連命令・省令案

- 新着一覧を巡回する
- 法令名、案件名、省庁、募集期間、結果 URL を `public-comments.json` に書き出す
- 法案・法令と名称類似で紐付ける

## 7. Update Frequency

| Source                   | Frequency |
| ------------------------ | --------- |
| 官報                     | daily     |
| 内閣官房                 | daily     |
| 衆議院                   | daily     |
| 参議院                   | daily     |
| e-Gov 法令 API           | daily     |
| e-Gov パブリックコメント | daily     |

デフォルト実行時刻は JST 06:00。バッチ実行 → JSON 更新 → 再ビルド・デプロイまでを 1 サイクルとする。

## 8. Development

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

## 9. Core Entities

### 9.1 Bill

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
