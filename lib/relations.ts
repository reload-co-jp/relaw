/**
 * 法案・法令間の関連付け。推測は行わず、公的データ上で一意に確認できる関係のみを扱う。
 *
 * - 根拠法令: 政令・省令の制定文 (「…法（令和六年法律第三十八号）…の規定に基づき」) に
 *   法令番号が明記された法令
 * - 改正法令: e-Gov の改正履歴 (版) に記録された改正法令番号
 * - 法案 → 法令: 成立した法案の題名から「案」を除いたものが法令の題名と一致し、
 *   かつ公布日が一致するもの (新規制定法)、または改正履歴の改正法令題名・公布日と一致するもの (改正法)
 */
import {
  getBills,
  getLawText,
  getLaws,
  getPublicComments,
  getAllLawVersions,
} from "./data"
import type { Bill, Law, LawVersion, PublicComment } from "./types"

const LAW_NUMBER_PATTERN =
  /(?:明治|大正|昭和|平成|令和)[元〇一二三四五六七八九十百]+年[^（）「」、。\s]{1,20}?第[〇一二三四五六七八九十百千]+号/g

/** 先頭段落が「…制定する。」「…定める。」で終わる場合、それを制定文とみなす */
export const getEnactmentClause = (lawId: string): string | undefined => {
  const first = getLawText(lawId)?.blocks[0]
  if (
    first?.type !== "paragraph" ||
    /^第[一二三四五六七八九十百]+条/.test(first.text)
  )
    return undefined
  return /(制定する|定める)。$/.test(first.text) ? first.text : undefined
}

/** 第一条が目的・趣旨規定であればその本文を返す */
export const getPurposeArticle = (lawId: string): string | undefined => {
  const blocks = getLawText(lawId)?.blocks ?? []
  const index = blocks.findIndex(
    (block) => block.type === "paragraph" && /^第一条\s/.test(block.text)
  )
  if (index < 1 || !/（(目的|趣旨)）/.test(blocks[index - 1].text))
    return undefined
  return blocks[index].text.replace(/^第一条\s+/, "")
}

/** 法令番号から制定機関を取り出す (省令・府令・庁令・規則のみ。法律・政令は所管府省を特定できない) */
export const getIssuingBody = (law: Law): string | undefined => {
  const match = law.lawNumber?.match(
    /^(?:明治|大正|昭和|平成|令和)[元〇一二三四五六七八九十百]+年(.+?)(省令|府令|庁令|規則)第/
  )
  if (!match) return undefined
  return (
    match[1] +
    ({ 省令: "省", 府令: "府", 庁令: "庁", 規則: "" }[match[2]] ?? "")
  )
}

export interface LawRelations {
  /** 制定文で根拠とされた法令 */
  basis: Law[]
  /** この法令を根拠として定められた政令・省令等 */
  delegated: Law[]
  /** この法令を改正した法令 (データ内に存在するもの) */
  amendedBy: { version: LawVersion; law?: Law }[]
  /** この法令が改正した法令 */
  amends: Law[]
  bills: Bill[]
  publicComments: PublicComment[]
}

export interface BillRelations {
  enactedLaw?: Law
  amendedLaws: Law[]
  publicComments: PublicComment[]
}

const stripBillSuffix = (title: string): string => title.replace(/案$/, "")

let cache:
  | {
      lawRelations: Map<string, LawRelations>
      billRelations: Map<string, BillRelations>
    }
  | undefined

const build = () => {
  const laws = getLaws()
  const bills = getBills()
  const versions = getAllLawVersions()
  const comments = getPublicComments()
  const lawByNumber = new Map(
    laws.filter((law) => law.lawNumber).map((law) => [law.lawNumber, law])
  )

  const lawRelations = new Map<string, LawRelations>(
    laws.map((law) => [
      law.id,
      {
        basis: [],
        delegated: [],
        amendedBy: [],
        amends: [],
        bills: [],
        publicComments: [],
      },
    ])
  )
  const billRelations = new Map<string, BillRelations>(
    bills.map((bill) => [bill.id, { amendedLaws: [], publicComments: [] }])
  )
  const lawById = new Map(laws.map((law) => [law.id, law]))
  const pushUnique = <T>(list: T[], item: T) => {
    if (!list.includes(item)) list.push(item)
  }

  for (const law of laws) {
    const clause = getEnactmentClause(law.id)
    for (const number of clause?.match(LAW_NUMBER_PATTERN) ?? []) {
      const basis = lawByNumber.get(number)
      if (!basis || basis.id === law.id) continue
      pushUnique(lawRelations.get(law.id)!.basis, basis)
      pushUnique(lawRelations.get(basis.id)!.delegated, law)
    }
  }

  for (const version of versions) {
    if (!version.amendmentLawNumber) continue
    const target = lawRelations.get(version.lawId)
    if (!target) continue
    const amending = lawByNumber.get(version.amendmentLawNumber)
    target.amendedBy.push({ version, law: amending })
    const amended = lawById.get(version.lawId)
    if (amending && amended && amending.id !== amended.id)
      pushUnique(lawRelations.get(amending.id)!.amends, amended)
  }

  for (const bill of bills) {
    if (!bill.promulgatedAt) continue
    const title = stripBillSuffix(bill.title)
    const relations = billRelations.get(bill.id)!
    const enacted = laws.find(
      (law) => law.title === title && law.promulgatedAt === bill.promulgatedAt
    )
    if (enacted) {
      relations.enactedLaw = enacted
      lawRelations.get(enacted.id)!.bills.push(bill)
    }
    for (const version of versions) {
      if (
        version.amendmentLawTitle !== title ||
        version.promulgatedAt !== bill.promulgatedAt
      )
        continue
      const amended = lawById.get(version.lawId)
      if (!amended) continue
      pushUnique(relations.amendedLaws, amended)
      pushUnique(lawRelations.get(amended.id)!.bills, bill)
    }
  }

  for (const comment of comments) {
    if (comment.lawId)
      lawRelations.get(comment.lawId)?.publicComments.push(comment)
    if (comment.billId)
      billRelations.get(comment.billId)?.publicComments.push(comment)
  }

  return { lawRelations, billRelations }
}

export const getLawRelations = (lawId: string): LawRelations => {
  cache ??= build()
  return cache.lawRelations.get(lawId)!
}

export const getBillRelations = (billId: string): BillRelations => {
  cache ??= build()
  return cache.billRelations.get(billId)!
}
