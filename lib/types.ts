export type BillStatus =
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

export interface Bill {
  id: string
  title: string
  titleKana?: string
  billNumber?: string
  /** 直近に審議された国会回次 (継続審査で提出回次より進む) */
  dietSession?: number
  /** 提出回次 */
  submittedSession?: number
  /** 提出番号 (提出回次内の種別ごとの連番) */
  submittedNumber?: number
  proposerType?: "cabinet" | "representative" | "councillor" | "unknown"
  proposerName?: string
  ministry?: string
  category?: string
  status: BillStatus
  summary?: string
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

export type BillEventType =
  | "public_comment_started"
  | "public_comment_closed"
  | "submitted"
  | "committee_referral"
  | "committee_passed"
  | "amended"
  | "passed_lower_house"
  | "passed_upper_house"
  | "passed_diet"
  | "promulgated"
  | "enforced"
  | "continued"
  | "withdrawn"
  | "rejected"
  | "expired"
  | "other"

export interface BillEvent {
  id: string
  billId: string
  type: BillEventType
  date: string
  chamber?: "lower" | "upper" | "both"
  description?: string
  sourceUrl?: string
  createdAt: string
}

export type LawType =
  | "constitution"
  | "act"
  | "cabinet_order"
  | "imperial_order"
  | "ministerial_ordinance"
  | "rule"
  | "other"

export type LawStatus = "in_force" | "not_yet_enforced" | "repealed" | "unknown"

export interface Law {
  id: string
  title: string
  titleKana?: string
  lawNumber?: string
  lawType: LawType
  status: LawStatus
  promulgatedAt?: string
  enforcedAt?: string
  repealedAt?: string
  egovLawId?: string
  billId?: string
  sourceUrl?: string
  createdAt: string
  updatedAt: string
}

export interface LawVersion {
  id: string
  lawId: string
  versionLabel: string
  amendmentLawNumber?: string
  amendmentLawTitle?: string
  promulgatedAt?: string
  enforcedAt?: string
  current?: boolean
  sourceUrl?: string
  createdAt: string
}

export interface LawTextBlock {
  type: "heading" | "caption" | "paragraph" | "item"
  level?: number
  text: string
}

export interface LawText {
  id: string
  lawId: string
  revisionId?: string
  fetchedAt: string
  blocks: LawTextBlock[]
}

export type DocumentType =
  | "bill_text"
  | "reason"
  | "summary"
  | "outline"
  | "comparison_table"
  | "reference_provisions"
  | "kanpo"
  | "minutes"
  | "result"
  | "raw"
  | "other"

export interface Document {
  id: string
  billId?: string
  lawId?: string
  title: string
  type: DocumentType
  url: string
  format?: "pdf" | "html" | "other"
  source: string
  publishedAt?: string
  createdAt: string
}

export type PublicCommentStatus =
  "open" | "closed" | "result_published" | "unknown"

export interface PublicComment {
  id: string
  title: string
  ministry?: string
  status: PublicCommentStatus
  startAt?: string
  endAt?: string
  resultPublishedAt?: string
  billId?: string
  lawId?: string
  relatedLawTitle?: string
  sourceUrl?: string
  resultUrl?: string
  createdAt: string
  updatedAt: string
}
