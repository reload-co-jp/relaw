/**
 * 巡回対象の国会回次。環境変数 COLLECT_SESSIONS (カンマ区切り) で上書き可。
 * 継続審査法案を回次をまたいで追跡するため昇順で処理する。
 */
export const dietSessions: number[] = (
  process.env.COLLECT_SESSIONS
    ? process.env.COLLECT_SESSIONS.split(",").map((s) => Number(s.trim()))
    : [219, 220, 221]
).sort((a, b) => a - b)

/** e-Gov 法令 API で取得対象とする公布日の下限 (日数) */
export const lawPromulgationWindowDays = Number(
  process.env.COLLECT_LAW_WINDOW_DAYS ?? 730
)

/** 1 回の収集で法令本文を取得する最大件数 */
export const lawTextFetchLimit = Number(
  process.env.COLLECT_LAW_TEXT_LIMIT ?? 100
)
