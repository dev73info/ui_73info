import type { ComponentSize, Tone } from '../../types/common'

/**
 * 标签的形状。
 *
 * `soft`（浅底 + 深字）是《设计规范》第三节明确要求新写状态标签采用的思路——
 * 「不要直接用饱和色做背景」。
 */
export type TTagVariant = 'soft' | 'outline' | 'solid'

export type TTagSize = Extract<ComponentSize, 'sm' | 'md'>

export interface TTagProps {
  /** 语义色，默认 `neutral` */
  tone?: Tone
  /** 形状，默认 `soft` */
  variant?: TTagVariant
  /**
   * 尺寸，默认 `md`。
   *
   * - `md` = 28px 高 / 12px 字，取自 `.wb-badge` 与 `.dev-chip` 的共同规格
   * - `sm` = 22px 高 / 11px 字，给「标签与角标用 11px」那一档（《设计规范》第四节）；
   *   高度是把 28px 减两档 3px 内边距推出来的，源文件没有登记过一个 11px 标签的高度
   */
  size?: TTagSize
  /** 可关闭：右侧出现关闭按钮 */
  closable?: boolean
}

export interface TTagEmits {
  (e: 'close', event: MouseEvent): void
}
