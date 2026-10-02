/**
 * 「○○とは？」に答える概要文を、公的データの値だけを組み合わせて生成する。
 * 値が無い項目は文に含めない (推測で補わない)。
 */
import { today } from "./data"
import { formatDate } from "./format"
import { billStatusDescriptions, lawTypeLabels } from "./labels"
import {
  getBillRelations,
  getLawRelations,
  getPurposeArticle,
} from "./relations"
import type { Bill, Law } from "./types"

export const lawOverview = (law: Law): string[] => {
  const type = lawTypeLabels[law.lawType]
  const relations = getLawRelations(law.id)
  const sentences = [
    `${law.title}${law.lawNumber ? `（${law.lawNumber}）` : ""}は、${
      law.promulgatedAt ? `${formatDate(law.promulgatedAt)}に公布された` : ""
    }${type}です。`,
  ]
  if (relations.basis.length > 0)
    sentences.push(
      `${relations.basis.map((basis) => basis.title).join("、")}の規定に基づいて定められています。`
    )
  if (law.status === "repealed")
    sentences.push(
      `現在は廃止されています${law.repealedAt ? `（${formatDate(law.repealedAt)}廃止）` : ""}。`
    )
  else if (law.enforcedAt)
    sentences.push(
      law.enforcedAt > today()
        ? `${formatDate(law.enforcedAt)}に施行される予定です。`
        : `${formatDate(law.enforcedAt)}から施行されています。`
    )
  if (relations.amendedBy.length > 0)
    sentences.push(
      `公布後、${relations.amendedBy.length}件の改正が行われています。`
    )
  return sentences
}

/** 第一条の目的規定は「○○とは」の答えとして最も正確なため、概要と description に使う */
export const lawDescription = (law: Law): string => {
  const purpose = getPurposeArticle(law.id)
  return [...lawOverview(law), purpose && `第一条（目的）: ${purpose}`]
    .filter(Boolean)
    .join("")
}

const proposerNames = {
  cabinet: "内閣",
  representative: "衆議院議員",
  councillor: "参議院議員",
} as const

export const billOverview = (bill: Bill): string[] => {
  const proposer =
    bill.proposerType && bill.proposerType !== "unknown"
      ? proposerNames[bill.proposerType]
      : undefined
  const sentences = [
    `${bill.title}${bill.billNumber ? `（${bill.billNumber}）` : ""}は、${
      bill.submittedSession ? `第${bill.submittedSession}回国会に` : ""
    }${proposer ? `${proposer}が` : ""}提出した法律案です。`,
  ]
  const steps = (
    [
      [bill.enactedAt, "成立し"],
      [bill.promulgatedAt, "公布され"],
      [bill.enforcedAt, "施行され"],
    ] as const
  )
    .filter(([date]) => date)
    .map(([date, verb]) => `${formatDate(date as string)}に${verb}`)
  sentences.push(
    steps.length > 0
      ? `${steps.join("、")}ました。`
      : `${billStatusDescriptions[bill.status]}。`
  )
  const { enactedLaw } = getBillRelations(bill.id)
  if (enactedLaw) sentences.push(`成立後の法律は「${enactedLaw.title}」です。`)
  return sentences
}

export const billDescription = (bill: Bill): string =>
  [...billOverview(bill), bill.summary].filter(Boolean).join("")
