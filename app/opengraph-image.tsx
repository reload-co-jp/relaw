import { ImageResponse } from "next/og"
import { siteName } from "lib/seo"

export const dynamic = "force-static"

export const alt = `${siteName} — 法案・法令ライフサイクルモニタリング`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const tagline = "法案・法令ライフサイクルモニタリング"
const stages = ["提出", "審議", "成立", "公布", "施行"]

// satori は woff2 非対応のため、旧 UA を指定して TTF 版の CSS を取得する
const loadNotoSansJP = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&text=${encodeURIComponent(text)}`,
        { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" } }
      )
    ).text()
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1]
    if (!url) return null
    return await (await fetch(url)).arrayBuffer()
  } catch {
    return null
  }
}

const Image = async () => {
  const fontText = `${siteName}${tagline}${stages.join("")}→`
  const fontData = await loadNotoSansJP(fontText)
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #10141b 0%, #1c2532 100%)",
          color: "#f2f4f8",
        }}
      >
        <div
          style={{ fontSize: 120, fontWeight: 700, letterSpacing: "-0.02em" }}
        >
          {siteName}
        </div>
        <div style={{ fontSize: 40, marginTop: 24, color: "#9fb3cc" }}>
          {tagline}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 48,
            fontSize: 28,
            color: "#c8d3e0",
          }}
        >
          {stages.map((stage, index) => (
            <span key={stage} style={{ display: "flex", gap: 16 }}>
              {index > 0 && <span>→</span>}
              <span>{stage}</span>
            </span>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Noto Sans JP",
              data: fontData,
              weight: 700 as const,
              style: "normal" as const,
            },
          ]
        : undefined,
    }
  )
}

export default Image
