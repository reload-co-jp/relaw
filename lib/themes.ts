import type { Bill, Law } from "./types"

export interface Theme {
  slug: string
  name: string
  /** 題名にいずれかを含めばテーマに属するとみなす */
  keywords: string[]
}

// ponytail: 題名のキーワード一致による分類。誤分類が問題になったら laws/bills 側に themes を持たせて手動で上書きする
export const themes: Theme[] = [
  { slug: "ai", name: "AI", keywords: ["人工知能"] },
  {
    slug: "personal-information",
    name: "個人情報",
    keywords: ["個人情報", "個人を識別するための番号"],
  },
  {
    slug: "cybersecurity",
    name: "サイバーセキュリティ",
    keywords: ["サイバー", "電子計算機に対する不正"],
  },
  {
    slug: "labor",
    name: "労働",
    keywords: ["労働", "雇用", "職業安定", "賃金", "育児休業", "介護休業"],
  },
  { slug: "tax", name: "税", keywords: ["税"] },
  {
    slug: "finance",
    name: "金融",
    keywords: ["金融", "銀行", "保険業", "金融商品", "資金決済", "信託"],
  },
  {
    slug: "medical",
    name: "医療",
    keywords: ["医療", "医薬品", "医師", "健康保険", "病院", "感染症"],
  },
  { slug: "education", name: "教育", keywords: ["教育", "学校", "大学"] },
  {
    slug: "immigration",
    name: "外国人・在留資格",
    keywords: ["出入国管理", "難民", "在留", "外国人", "育成就労"],
  },
]

export const matchThemes = (title: string): Theme[] =>
  themes.filter((theme) =>
    theme.keywords.some((keyword) => title.includes(keyword))
  )

export const getThemeItems = <T extends Law | Bill>(
  slug: string,
  items: T[]
): T[] => {
  const theme = themes.find((item) => item.slug === slug)
  if (!theme) return []
  return items.filter((item) => matchThemes(item.title).includes(theme))
}
