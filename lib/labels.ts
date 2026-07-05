import type {
  Bill,
  BillEventType,
  BillStatus,
  DocumentType,
  LawStatus,
  LawType,
  PublicCommentStatus,
} from "./types"

export const billStatusLabels: Record<BillStatus, string> = {
  draft: "起草中",
  public_comment: "意見募集中",
  submitted: "提出済",
  committee_review: "委員会審議中",
  passed_lower_house: "衆議院通過",
  passed_upper_house: "参議院通過",
  passed_diet: "成立",
  promulgated: "公布済",
  enforced: "施行済",
  withdrawn: "撤回",
  rejected: "否決",
  expired: "廃案",
  unknown: "不明",
}

export const billStatusColors: Record<BillStatus, string> = {
  draft: "#8a8577",
  public_comment: "#b8a26a",
  submitted: "#8ea3bd",
  committee_review: "#c8a96a",
  passed_lower_house: "#9db8d2",
  passed_upper_house: "#9db8d2",
  passed_diet: "#8fbf9f",
  promulgated: "#8fbf9f",
  enforced: "#79a98b",
  withdrawn: "#c08a8a",
  rejected: "#c08a8a",
  expired: "#77726a",
  unknown: "#77726a",
}

export const proposerTypeLabels: Record<
  NonNullable<Bill["proposerType"]>,
  string
> = {
  cabinet: "内閣提出",
  representative: "衆議院議員提出",
  councillor: "参議院議員提出",
  unknown: "不明",
}

export const billEventTypeLabels: Record<BillEventType, string> = {
  public_comment_started: "意見募集開始",
  public_comment_closed: "意見募集終了",
  submitted: "提出",
  committee_referral: "委員会付託",
  committee_passed: "委員会可決",
  amended: "修正",
  passed_lower_house: "衆議院可決",
  passed_upper_house: "参議院可決",
  passed_diet: "成立",
  promulgated: "公布",
  enforced: "施行",
  continued: "継続審査",
  withdrawn: "撤回",
  rejected: "否決",
  expired: "廃案",
  other: "その他",
}

export const lawTypeLabels: Record<LawType, string> = {
  constitution: "憲法",
  act: "法律",
  cabinet_order: "政令",
  imperial_order: "勅令",
  ministerial_ordinance: "省令",
  rule: "規則",
  other: "その他",
}

export const lawStatusLabels: Record<LawStatus, string> = {
  in_force: "施行中",
  not_yet_enforced: "未施行",
  repealed: "廃止",
  unknown: "不明",
}

export const lawTypeColor = "#a89ec4"

export const lawStatusColors: Record<LawStatus, string> = {
  in_force: "#8fbf9f",
  not_yet_enforced: "#c8a96a",
  repealed: "#c08a8a",
  unknown: "#77726a",
}

export const publicCommentStatusColors: Record<PublicCommentStatus, string> = {
  open: "#8fbf9f",
  closed: "#8a8577",
  result_published: "#8ea3bd",
  unknown: "#77726a",
}

export const documentTypeLabels: Record<DocumentType, string> = {
  bill_text: "法律案本文",
  reason: "理由",
  summary: "概要",
  outline: "要綱",
  comparison_table: "新旧対照表",
  reference_provisions: "参照条文",
  kanpo: "官報",
  result: "結果",
  raw: "未分類",
  other: "その他",
}

export const publicCommentStatusLabels: Record<PublicCommentStatus, string> = {
  open: "意見募集中",
  closed: "募集終了",
  result_published: "結果公表済",
  unknown: "不明",
}
