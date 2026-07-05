import { FC } from "react"

const steps: [string, string][] = [
  ["提出", "内閣や国会議員が「こういう法律を作りたい」という案を国会に出します"],
  [
    "審議",
    "担当の委員会で内容を詳しく検討したあと、衆議院と参議院それぞれの本会議で賛成・反対を決めます",
  ],
  ["成立", "衆議院と参議院の両方で可決されると、法律になることが決まります"],
  ["公布", "新しい法律が官報（国のお知らせ）に掲載され、国民に知らされます"],
  ["施行", "決められた日から、法律としての効力が実際に始まります"],
]

export const LifecycleGuide: FC = () => (
  <details className="guide">
    <summary>はじめての方へ — 法案が法律になるまで</summary>
    <ol className="guide-steps">
      {steps.map(([title, description], index) => (
        <li key={title}>
          <span className="guide-step-number">{index + 1}</span>
          <span>
            <b>{title}</b> — {description}
          </span>
        </li>
      ))}
    </ol>
    <p className="guide-note">
      途中で反対多数になったり（否決）、会期が終わって結論が出なかったり（廃案）すると、その法案は法律になりません。
      各法案のバッジやチャートに用語の説明が表示されるので、マウスを重ねてみてください。
    </p>
  </details>
)
