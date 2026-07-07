import { USER_AGENT } from "./lib.ts"

/** 収集済みデータが存在する最古の回次 (これ未満は巡回しない) */
const sessionFloor = 219

/** プローブ開始基準となる既知の最新回次 (これ以降は自動検出する) */
const knownLatestSession = 221

/** 最新回次から遡って巡回する回次数 (継続審査法案・審査未了判定の追跡に必要) */
const sessionWindow = 3

/** 衆議院の議案一覧ページが存在するか (回次召集後に公開される) */
const sessionPageExists = async (session: number): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://www.shugiin.go.jp/internet/itdb_gian.nsf/html/gian/kaiji${session}.htm`,
      { method: "HEAD", headers: { "User-Agent": USER_AGENT } }
    )
    return response.ok
  } catch {
    return false
  }
}

let cached: Promise<number[]> | undefined

/**
 * 巡回対象の国会回次。環境変数 COLLECT_SESSIONS (カンマ区切り) で上書き可。
 * 未指定時は衆議院の議案一覧ページの存在から最新回次を検出し、直近 3 回次を返す。
 * 継続審査法案を回次をまたいで追跡するため昇順。
 */
export const resolveDietSessions = (): Promise<number[]> => {
  cached ??= (async () => {
    if (process.env.COLLECT_SESSIONS)
      return process.env.COLLECT_SESSIONS.split(",")
        .map((s) => Number(s.trim()))
        .sort((a, b) => a - b)
    let latest = knownLatestSession
    while (await sessionPageExists(latest + 1)) latest += 1
    const first = Math.max(sessionFloor, latest - (sessionWindow - 1))
    return Array.from({ length: latest - first + 1 }, (_, i) => first + i)
  })()
  return cached
}

/** e-Gov 法令 API で取得対象とする公布日の下限 (日数) */
export const lawPromulgationWindowDays = Number(
  process.env.COLLECT_LAW_WINDOW_DAYS ?? 730
)

/** 1 回の収集で法令本文を取得する最大件数 */
export const lawTextFetchLimit = Number(
  process.env.COLLECT_LAW_TEXT_LIMIT ?? 100
)
