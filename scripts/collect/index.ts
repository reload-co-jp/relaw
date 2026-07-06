import { collectEgovLaws } from "./egov-laws.ts"
import { collectEgovLawText } from "./egov-law-text.ts"
import { collectKanpo } from "./kanpo.ts"
import { collectNaikaku } from "./naikaku.ts"
import { collectShugiin } from "./shugiin.ts"
import { collectSangiin } from "./sangiin.ts"
import { collectKokkai } from "./kokkai.ts"
import { collectPublicComments } from "./public-comments.ts"
import type { CollectorResult } from "./lib.ts"

const collectors: (() => Promise<CollectorResult>)[] = [
  collectEgovLaws,
  collectEgovLawText, // laws.json 更新後に本文を取得する
  collectKanpo,
  collectNaikaku,
  collectShugiin, // 衆議院 → 参議院の順で統合する
  collectSangiin,
  collectKokkai, // bills.json 更新後に審議中法案の会議録を取得する
  collectPublicComments,
]

const main = async () => {
  const results: CollectorResult[] = []
  for (const collector of collectors) {
    try {
      results.push(await collector())
    } catch (error) {
      results.push({
        source: collector.name,
        updated: 0,
        errors: [String(error)],
      })
    }
  }

  let hasError = false
  for (const result of results) {
    console.log(`[${result.source}] updated: ${result.updated}`)
    for (const error of result.errors) {
      hasError = true
      console.error(`[${result.source}] error: ${error}`)
    }
  }

  // 一部ソースの失敗は許容する。全ソース失敗時のみ異常終了。
  if (
    results.every((result) => result.errors.length > 0 && result.updated === 0)
  ) {
    console.error("全ソースの収集に失敗")
    process.exit(1)
  }
  if (hasError) console.warn("一部ソースでエラーあり (継続)")
}

await main()
