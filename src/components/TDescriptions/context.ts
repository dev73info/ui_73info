/**
 * 描述列表上下文
 */

import type { InjectionKey, Ref } from 'vue'

export interface DescriptionsContext {
  border: Ref<boolean>
  direction: Ref<'horizontal' | 'vertical'>
}

export const DESCRIPTIONS_CONTEXT: InjectionKey<DescriptionsContext> =
  Symbol('t73-descriptions')
