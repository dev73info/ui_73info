/**
 * TRadio / TRadioGroup / TRadioButton 的属性与事件
 */

import type { ComponentSize } from '../../types/common'
import type { SelectValue } from '../TSelect/types'

export interface TRadioProps {
  /** 放在 `TRadioGroup` 里时，本项代表的值 */
  value?: SelectValue
  /** 单独使用时的双向绑定值 */
  modelValue?: SelectValue
  label?: string
  disabled?: boolean
  size?: ComponentSize
  id?: string
  name?: string
  ariaLabel?: string
}

export interface TRadioEmits {
  (e: 'update:modelValue', value: SelectValue): void
  (e: 'change', value: SelectValue): void
}

export interface TRadioGroupProps {
  modelValue?: SelectValue
  disabled?: boolean
  size?: ComponentSize
  direction?: 'horizontal' | 'vertical'
  name?: string
  ariaLabel?: string
}

export interface TRadioGroupEmits {
  (e: 'update:modelValue', value: SelectValue): void
  (e: 'change', value: SelectValue): void
}

export interface TRadioButtonProps extends TRadioProps {
  /** 按钮上是否只显示图标（此时必须给 `aria-label`） */
  iconOnly?: boolean
}
