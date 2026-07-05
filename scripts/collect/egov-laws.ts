import type { Law, LawType, LawVersion } from "../../lib/types.ts"
import {
  fetchJson,
  loadCollection,
  nowIso,
  saveCollection,
  sleep,
  upsert,
  type CollectorResult,
} from "./lib.ts"
import { lawPromulgationWindowDays } from "./config.ts"

const API_BASE = "https://laws.e-gov.go.jp/api/2"
const PAGE_LIMIT = 500
const MAX_PAGES = 40

interface EgovLawInfo {
  law_id?: string
  law_num?: string
  law_type?: string
  promulgation_date?: string
}

interface EgovRevisionInfo {
  law_revision_id?: string
  law_title?: string
  law_title_kana?: string
  amendment_law_num?: string
  amendment_law_title?: string
  amendment_promulgate_date?: string
  amendment_enforcement_date?: string
  current_revision_status?: string
  repeal_status?: string
}

interface EgovLawsResponse {
  total_count?: number
  next_offset?: number | null
  laws?: {
    law_info?: EgovLawInfo
    revision_info?: EgovRevisionInfo
    current_revision_info?: EgovRevisionInfo
  }[]
}

const lawTypeMap: Record<string, LawType> = {
  Constitution: "constitution",
  Act: "act",
  CabinetOrder: "cabinet_order",
  ImperialOrder: "imperial_order",
  MinisterialOrdinance: "ministerial_ordinance",
  Rule: "rule",
}

const toLawStatus = (revision?: EgovRevisionInfo): Law["status"] => {
  if (!revision) return "unknown"
  if (revision.repeal_status && revision.repeal_status !== "None")
    return "repealed"
  return "in_force"
}

export const collectEgovLaws = async (): Promise<CollectorResult> => {
  const errors: string[] = []
  let laws = loadCollection<Law>("laws.json")
  let versions = loadCollection<LawVersion>("law-versions.json")
  let updated = 0

  const cutoff = new Date(
    Date.now() - lawPromulgationWindowDays * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10)

  let offset = 0
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let response: EgovLawsResponse
    try {
      response = await fetchJson<EgovLawsResponse>(
        `${API_BASE}/laws?limit=${PAGE_LIMIT}&offset=${offset}&promulgation_date_from=${cutoff}`
      )
    } catch (error) {
      errors.push(`laws page offset=${offset}: ${String(error)}`)
      break
    }

    for (const entry of response.laws ?? []) {
      const info = entry.law_info
      const revision = entry.current_revision_info ?? entry.revision_info
      if (!info?.law_id || !revision?.law_title) continue

      const law: Law = {
        id: `law-${info.law_id}`,
        title: revision.law_title,
        titleKana: revision.law_title_kana,
        lawNumber: info.law_num,
        lawType: lawTypeMap[info.law_type ?? ""] ?? "other",
        status: toLawStatus(revision),
        promulgatedAt: info.promulgation_date,
        egovLawId: info.law_id,
        sourceUrl: `https://laws.e-gov.go.jp/law/${info.law_id}`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }
      const lawResult = upsert(laws, law)
      laws = lawResult.collection
      if (lawResult.changed) updated += 1

      if (revision.law_revision_id) {
        const version: LawVersion = {
          id: `version-${revision.law_revision_id}`,
          lawId: law.id,
          versionLabel: revision.amendment_law_num
            ? `${revision.amendment_law_num}による改正`
            : "制定時",
          amendmentLawNumber: revision.amendment_law_num,
          amendmentLawTitle: revision.amendment_law_title,
          promulgatedAt:
            revision.amendment_promulgate_date ?? info.promulgation_date,
          enforcedAt: revision.amendment_enforcement_date,
          current: true,
          sourceUrl: law.sourceUrl,
          createdAt: nowIso(),
        }
        const versionResult = upsert(versions, version)
        versions = versionResult.collection
        if (versionResult.changed) updated += 1
      }
    }

    if (response.next_offset == null) break
    offset = response.next_offset
    await sleep(500)
  }

  saveCollection("laws.json", laws)
  saveCollection("law-versions.json", versions)
  return { source: "e-Gov 法令 API", updated, errors }
}
