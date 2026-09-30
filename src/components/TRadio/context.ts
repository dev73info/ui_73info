/**
 * 单选组上下文
 */

import type { InjectionKey, Ref } from 'vue'
import type { ComponentSize } from '../../types/common'
import type { SelectValue } from '../TSelect/types'

export interface RadioGroupContext {
  selected: Ref<SelectValue | undefined>
  disabled: Ref<boolean>
  size: Ref<ComponentSize>
  name: string | undefined
  select: (value: SelectValue) => void
}

export const RADIO_GROUP_CONTEXT: InjectionKey<RadioGroupContext> = Symbol('t73-radio-group')
