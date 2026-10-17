/**
 * 収集時に空白へ平坦化された議案要旨の改行を、箇条書きマーカーで復元する。
 * 元テキストの改行は収集時に半角スペースに潰れているため、
 * スペース直後のマーカー (一、/ １ / イ など) を段落・項目の先頭とみなす。
 */
export const formatSummary = (text: string): string =>
  text
    .replace(/ (?=[一二三四五六七八九十]+、)/g, "\n\n")
    .replace(/ (?=[０-９][０-９]? )/g, "\n")
    .replace(/ (?=[イロハニホヘトチリヌルヲ] )/g, "\n")

/** "2024-10-17" → "2024年10月17日" */
export const formatDate = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number)
  return `${year}年${month}月${day}日`
}

const DAY_MS = 24 * 60 * 60 * 1000
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 日本時間の今日 ("2026-10-18")。ビルドは JST 06:00 (UTC 前日 21:00) に走るため UTC 基準だと 1 日ずれる */
export const today = (now = Date.now()): string =>
  new Date(now + JST_OFFSET_MS).toISOString().slice(0, 10)

/** from から date までの日数 (date が過去なら負) */
export const daysUntil = (date: string, from = today()): number =>
  Math.round((Date.parse(date) - Date.parse(from)) / DAY_MS)
