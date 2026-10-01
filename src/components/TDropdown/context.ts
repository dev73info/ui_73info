/**
 * 下拉菜单上下文
 */

import type { InjectionKey, Ref } from 'vue'

export interface DropdownContext {
  /** 菜单是否展开 */
  open: Ref<boolean>
  /** 收起菜单。`reason` 只用于 `visible-change` 的语义区分 */
  close: () => void
  /** 选中某一项：回抛 `command`，并按 `hideOnClick` 决定要不要收起 */
  runCommand: (command: unknown) => void
}

export const DROPDOWN_CONTEXT: InjectionKey<DropdownContext> = Symbol('t73-dropdown')
