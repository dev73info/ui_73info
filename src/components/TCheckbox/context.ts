/**
 * 复选框组上下文
 *
 * 组持有选中值与禁用态，项自注册——与 `TForm` / `TFormItem` 同一思路，
 * 与 `TSelect` / `TOption` 也同一思路（项从上下文取状态，不靠 props 层层透传）。
 */

import type { InjectionKey, Ref } from 'vue'
import type { ComponentSize } from '../../types/common'
import type { SelectValue } from '../TSelect/types'

export interface CheckboxGroupContext {
  /** 已勾选的值 */
  selected: Ref<SelectValue[]>
  disabled: Ref<boolean>
  size: Ref<ComponentSize>
  name: string | undefined
  /** 勾选/取消某一项，并把新数组发回给调用方 */
  toggle: (value: SelectValue) => void
}

export const CHECKBOX_GROUP_CONTEXT: InjectionKey<CheckboxGroupContext> =
  Symbol('t73-checkbox-group')
