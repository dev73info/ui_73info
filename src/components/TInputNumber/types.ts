/**
 * TInputNumber 的属性与事件
 */

import type { ComponentSize } from '../../types/common'

export interface TInputNumberProps {
  /** 数值。未填写时为 `null`（不是 `NaN`，也不是空串） */
  modelValue?: number | null
  min?: number
  max?: number
  /** 每次步进的幅度，默认 1 */
  step?: number
  /**
   * 小数位数。不传时按用户输入原样保留（`el-input-number` 的默认行为）；
   * 传了就在失焦/回车时四舍五入到这一位——仓库里的提现金额用 `:precision="2"`、
   * 积分用 `:precision="0"`。
   */
  precision?: number
  /** 大数是否用千分位显示，默认 `false` */
  thousands?: boolean
  disabled?: boolean
  readonly?: boolean
  /** 隐藏两侧的步进按钮 */
  controls?: boolean
  size?: ComponentSize
  placeholder?: string
  /** 前后缀插槽的语义名（不在输入框内参与解析，纯粹是装饰） */
  id?: string
  name?: string
  ariaLabel?: string
  autofocus?: boolean
}

export interface TInputNumberEmits {
  (e: 'update:modelValue', value: number | null): void
  (e: 'change', value: number | null): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}
