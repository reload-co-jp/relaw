import { FC } from "react"

export interface Stage {
  steps: readonly string[]
  current: number
}

/** カード用のコンパクトな段階インジケーター */
export const StageProgress: FC<Stage> = ({ steps, current }) => (
  <span
    className="stage-track"
    title={`${steps.slice(0, current + 1).join(" → ")}まで完了`}
  >
    {steps.map((step, index) => (
      <span
        key={step}
        className={index <= current ? "stage-seg done" : "stage-seg"}
      />
    ))}
    <span className="stage-track-label">{steps[current]}</span>
  </span>
)

/** 詳細ページ用のラベル付きステッパー */
export const StageFlow: FC<Stage> = ({ steps, current }) => (
  <ol className="stage-flow">
    {steps.map((step, index) => (
      <li
        key={step}
        className={
          index < current ? "done" : index === current ? "current" : undefined
        }
      >
        <span className="stage-dot" />
        <span className="stage-label">{step}</span>
      </li>
    ))}
  </ol>
)
