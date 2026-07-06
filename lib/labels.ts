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
  promulgated: "#74b3ae",
  enforced: "#79a98b",
  withdrawn: "#c08a8a",
  rejected: "#c08a8a",
  expired: "#77726a",
  unknown: "#77726a",
}

/** 政治に詳しくないユーザ向けの平易なステータス説明 */
export const billStatusDescriptions: Record<BillStatus, string> = {
  draft: "法律の案を準備している段階。まだ国会には出されていません",
  public_comment: "案について、国民から広く意見を募集している段階です",
  submitted: "法律の案が国会に出され、審議が始まるのを待っています",
  committee_review: "国会の委員会で、内容を詳しく検討しています",
  passed_lower_house: "衆議院で賛成多数となり、参議院に送られました",
  passed_upper_house: "参議院で賛成多数となりました",
  passed_diet: "衆議院・参議院の両方で可決され、法律になることが決まりました",
  promulgated: "新しい法律として、官報で国民に正式に知らされました",
  enforced: "法律としての効力が始まり、実際に適用されています",
  withdrawn: "提出した人（内閣や議員）が案を取り下げました",
  rejected: "国会で反対多数となり、法律にはなりませんでした",
  expired: "国会の会期が終わるまでに結論が出ず、廃案になりました",
  unknown: "現在の状態を確認できていません",
}

export const lawStatusDescriptions: Record<LawStatus, string> = {
  in_force: "現在有効で、実際に適用されている法令です",
  not_yet_enforced: "公布済みですが、効力はまだ始まっていません",
  repealed: "廃止され、現在は効力がありません",
  unknown: "現在の状態を確認できていません",
}

export const publicCommentStatusDescriptions: Record<
  PublicCommentStatus,
  string
> = {
  open: "誰でも意見を提出できる募集期間中です",
  closed: "意見の募集は終了し、結果を取りまとめています",
  result_published: "寄せられた意見と行政の考え方が公表されています",
  unknown: "現在の状態を確認できていません",
}

export const billEventTypeDescriptions: Record<BillEventType, string> = {
  public_comment_started: "案について国民からの意見募集が始まりました",
  public_comment_closed: "国民からの意見募集が締め切られました",
  submitted: "法律の案が国会に出されました",
  committee_referral: "内容を詳しく検討するため、担当の委員会に回されました",
  committee_passed: "委員会での検討が終わり、賛成多数となりました",
  amended: "審議の中で内容の一部が修正されました",
  passed_lower_house: "衆議院の本会議で賛成多数となりました",
  passed_upper_house: "参議院の本会議で賛成多数となりました",
  passed_diet: "両院で可決され、法律になることが決まりました",
  promulgated: "官報に掲載され、新しい法律として知らされました",
  enforced: "法律としての効力が始まりました",
  continued: "会期中に結論が出ず、次の国会で引き続き審議されます",
  withdrawn: "提出した人が案を取り下げました",
  rejected: "反対多数で否決されました",
  expired: "会期が終わるまでに結論が出ず、廃案になりました",
  other: "その他の動きがありました",
}

/** 法案ライフサイクルの主要段階 */
export const billStages = ["提出", "審議", "成立", "公布", "施行"] as const

/** 現在ステータス → 到達済み段階 (ステッパー非対象の状態は undefined) */
export const billStageIndex: Partial<Record<BillStatus, number>> = {
  submitted: 0,
  committee_review: 1,
  passed_lower_house: 1,
  passed_upper_house: 1,
  passed_diet: 2,
  promulgated: 3,
  enforced: 4,
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
  minutes: "会議録",
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
