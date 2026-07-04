# Relaw

法案・法令ライフサイクルモニタリングシステム

## 1. Product

Relaw は、日本の法案・法令の状態変化を、公的情報源から収集・正規化し、検索・閲覧・通知できる Web サービスである。

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

## 4. Data Sources

### 4.1 e-Gov 法令検索 API

用途。

- 現行法令本文
- 法令番号
- 法令名
- 施行日
- 改正履歴
- 条文取得

実装。

- API クライアントを作成する
- 取得結果を `laws` と `law_versions` に保存する
- 本文は全文検索対象にする

### 4.2 官報

用途。

- 法律公布
- 政令公布
- 省令公布
- 施行期日政令
- 廃止情報

実装。

- 官報の公開ページを毎日巡回する
- HTML または PDF から法令名、法令番号、公布日を抽出する
- 抽出できない場合も raw document として保存する

### 4.3 内閣官房 国会提出法案

用途。

- 内閣提出法案
- 法律案本文
- 理由
- 概要
- 要綱
- 新旧対照表
- 参照条文

実装。

- 国会回次ごとのページを巡回する
- 法案単位で資料 URL を保存する
- PDF は `documents` として保存する

### 4.4 衆議院 議案情報

用途。

- 提出法案
- 議案番号
- 提出日
- 審議経過
- 修正案
- 衆議院通過状況

実装。

- 国会回次ごとの議案一覧を巡回する
- 法案名と議案番号で既存 `bills` と突合する
- 状態変更を `bill_events` に追加する

### 4.5 参議院 議案情報

用途。

- 参議院での審議状況
- 可決状況
- 否決
- 継続審査
- 廃案

実装。

- 国会回次ごとの議案一覧を巡回する
- 衆議院側のデータと統合する
- 状態変更を `bill_events` に追加する

### 4.6 e-Gov パブリックコメント

用途。

- 意見募集開始
- 意見募集終了
- 結果公表
- 関連命令・省令案

実装。

- 新着一覧を巡回する
- 法令名、案件名、省庁、募集期間、結果 URL を保存する
- 法案・法令と名称類似で紐付ける

## 5. Update Frequency

| Source                   | Frequency |
| ------------------------ | --------- |
| 官報                     | daily     |
| 内閣官房                 | daily     |
| 衆議院                   | daily     |
| 参議院                   | daily     |
| e-Gov 法令 API           | daily     |
| e-Gov パブリックコメント | daily     |

デフォルト実行時刻は JST 06:00。

## 6. Core Entities

### 6.1 Bill

法案を表す。

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
