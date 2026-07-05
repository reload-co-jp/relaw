/** 巡回対象の国会回次。環境変数 COLLECT_SESSIONS (カンマ区切り) で上書き可 */
export const dietSessions: number[] = process.env.COLLECT_SESSIONS
  ? process.env.COLLECT_SESSIONS.split(",").map((s) => Number(s.trim()))
  : [219]

/** e-Gov 法令 API で取得対象とする公布日の下限 (日数) */
export const lawPromulgationWindowDays = Number(
  process.env.COLLECT_LAW_WINDOW_DAYS ?? 730
)
