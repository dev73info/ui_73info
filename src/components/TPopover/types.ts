/**
 * TPopover 的属性与事件
 */

import type { Placement } from '../../primitives'

export type PopoverTrigger = 'click' | 'hover' | 'focus'

export interface TPopoverProps {
  /** 期望位置，默认 `bottom` */
  placement?: Placement
  trigger?: PopoverTrigger
  /** 是否在面板里放一行标题 */
  title?: string
  /** 面板宽度。不传时按内容自适应，并受 `maxWidth` 约束 */
  width?: string | number
  maxWidth?: string | number
  /** 面板与锚点的间距，默认 8px（气泡比下拉菜单离开得远一点，因为自带尖角） */
  gap?: number
  /** 是否画尖角 */
  arrow?: boolean
  disabled?: boolean
  /** 受控展开态 */
  open?: boolean
  showDelay?: number
  hideDelay?: number
  ariaLabel?: string
}

export interface TPopoverEmits {
  (e: 'update:open', open: boolean): void
  (e: 'open'): void
  (e: 'close'): void
}
