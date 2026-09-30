/**
 * TCheckbox / TCheckboxGroup 的属性与事件
 */

import type { ComponentSize } from '../../types/common'
import type { SelectValue } from '../TSelect/types'

export interface TCheckboxProps {
  /** 单独使用时的双向绑定值（布尔） */
  modelValue?: boolean
  /** 放在 `TCheckboxGroup` 里时，本项代表的值 */
  value?: SelectValue
  label?: string
  disabled?: boolean
  /** 不确定态（如「全选」在部分选中时） */
  indeterminate?: boolean
  size?: ComponentSize
  id?: string
  name?: string
  ariaLabel?: string
}

export interface TCheckboxEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}

export interface TCheckboxGroupProps {
  modelValue?: SelectValue[]
  disabled?: boolean
  size?: ComponentSize
  /** 排列方向，默认横向。选项多或文案长时用 `vertical` */
  direction?: 'horizontal' | 'vertical'
  name?: string
  ariaLabel?: string
}

export interface TCheckboxGroupEmits {
  (e: 'update:modelValue', value: SelectValue[]): void
  (e: 'change', value: SelectValue[]): void
}
