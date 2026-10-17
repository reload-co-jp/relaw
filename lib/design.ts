/**
 * デザイントークン。CSS 変数として出力し (layout)、コンポーネント内の CSS からは var(--…) で参照する。
 * 状態色は意味ごとに統一する (進行中 / 完了・有効 / 公表・提出 / 終了・失敗 / 中立)。
 */
export const colors = {
  bg: "#f6f6f3",
  surface: "#ffffff",
  surfaceHover: "#f1f1ed",
  line: "#e2e1dc",
  lineStrong: "#c9c7c0",
  text: "#1c1e22",
  textMuted: "#4f545c",
  textFaint: "#676c74",
  accent: "#1d4f91",
  accentStrong: "#143a6c",
  accentLine: "rgba(29, 79, 145, 0.35)",
  accentSoft: "rgba(29, 79, 145, 0.08)",
  urgent: "#a3312a",
  urgentSoft: "rgba(163, 49, 42, 0.08)",
} as const

/** 状態の意味ごとの色 (白背景でコントラスト 4.5:1 以上) */
export const tones = {
  progress: "#8a5300",
  success: "#1e6b3a",
  promulgated: "#0b6470",
  info: "#1d5a9e",
  danger: "#a3312a",
  neutral: "#5b6068",
  kindBill: "#34557a",
  kindLaw: "#5b4a9e",
  kindPublicComment: "#7a5414",
} as const

const kebab = (key: string): string =>
  key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)

export const cssVariables = `:root{${[
  ...Object.entries(colors).map(([key, value]) => `--${kebab(key)}:${value}`),
  ...Object.entries(tones).map(
    ([key, value]) => `--tone-${kebab(key)}:${value}`
  ),
  "--radius:0.375rem",
  "--radius-lg:0.5rem",
  `--serif:"Shippori Mincho","Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif`,
  `--sans:"Hiragino Kaku Gothic ProN","Hiragino Sans","Yu Gothic UI","Yu Gothic","Noto Sans JP",sans-serif`,
].join(";")};color-scheme:light;background:var(--bg);color:var(--text)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}`
