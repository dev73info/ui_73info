/**
 * TTooltip 的属性与事件
 */

import type { Placement } from '../../primitives'

/** 提示默认只在锚点上方/下方出现，不做左右——横排文字在竖排空间里才读得舒服 */
export type TooltipPlacement = Extract<
  Placement,
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'left' | 'right'
>

export type TooltipTrigger = 'hover' | 'focus' | 'click'

export interface TTooltipProps {
  /** 提示文字。要用富内容就用 `#content` 插槽 */
  content?: string
  placement?: TooltipPlacement
  /**
   * 一个或多个触发方式，默认 `['hover', 'focus']`。
   * **默认带上 `focus` 是刻意的**：只用悬停时，键盘用户 Tab 到那颗图标按钮上看不到任何提示。
   */
  trigger?: TooltipTrigger | TooltipTrigger[]
  disabled?: boolean
  /** 悬停到出现之间的延迟（ms），默认 120 */
  showDelay?: number
  /** 移开到消失之间的延迟（ms），默认 80 */
  hideDelay?: number
  /** 气泡最大宽度，默认 260px。长提示会换行而不是排成一行 */
  maxWidth?: string | number
  /** 受控展开态。不传时由组件自己管 */
  open?: boolean
  ariaLabel?: string
}

export interface TTooltipEmits {
  (e: 'update:open', open: boolean): void
  (e: 'open'): void
  (e: 'close'): void
}
