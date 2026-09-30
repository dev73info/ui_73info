/**
 * TSelect 内部的上下文
 *
 * 两个方向：
 * - `SELECT_CONTEXT`：选择器 → 选项。选项据此知道「我选没选中」「点我该做什么」
 *   「当前的过滤词是什么」。
 * - `LISTBOX_CONTEXT`（在 `primitives/useListbox.ts`）：高亮与键盘导航。
 *   选项同时注册进这一套，`↑↓` 才认得它。
 *
 * ## 为什么选项要「常驻注册」而不是「打开面板才注册」
 *
 * 面板关闭时必须能显示已选项的文本。`TDialog` 那类弹层可以每次打开重新挂载
 * （表单不该残留上一次的校验态），**下拉不行**：一旦面板内容是 `v-if` 出来的，
 * 关闭状态下 `TOption` 就不存在，选择器没有地方查「值 `paid` 对应的中文是什么」，
 * 触发器上只能显示 `paid`。所以这里的面板**始终挂载**，只靠 CSS 收起，
 * 选项因此一直可查。这也是 Element Plus 的做法。
 */

import type { InjectionKey, Ref } from 'vue'
import type { ComponentSize } from '../../types/common'
import type { SelectValue } from './types'

/** 选项注册到选择器的一条记录 */
export interface SelectOptionEntry {
  /** 由 `TOption` 自己用 `useId()` 生成的稳定 id */
  id: string
  value: SelectValue
  /** 读可见文本。用函数而不是字符串：插槽内容可能随外部状态变化 */
  label: () => string
  disabled: () => boolean
}

export interface SelectContext {
  multiple: Ref<boolean>
  disabled: Ref<boolean>
  size: Ref<ComponentSize>
  /** 面板是否展开 */
  open: Ref<boolean>
  /** 当前的过滤词（`filterable` 时有效） */
  query: Ref<string>
  /** 已选值 */
  selected: Ref<SelectValue[]>
  /** 是否命中过滤词。非 `filterable` 时恒为 true */
  matches: (label: string) => boolean
  isSelected: (value: SelectValue) => boolean
  /** 选中一项：单选直接替换并收起面板，多选切换数组成员 */
  choose: (value: SelectValue) => void
  /** 选项挂载时登记（无论面板开合都会调用） */
  registerOption: (entry: SelectOptionEntry) => void
  /** 选项卸载时注销 */
  unregisterOption: (id: string) => void
  /** 过滤词变化后让高亮落到第一个可见项上 */
  onFilterChanged: () => void
}

export const SELECT_CONTEXT: InjectionKey<SelectContext> = Symbol('t73-select')

/** 选项组 → 组内选项：把组的禁用态广播下去 */
export const OPTION_GROUP_CONTEXT: InjectionKey<{ disabled: Ref<boolean> }> = Symbol('t73-option-group')

/** 值的相等判定。选项值都是原始值，`Object.is` 足够，且能正确处理 `NaN` */
export function isSameValue(a: SelectValue | undefined, b: SelectValue | undefined): boolean {
  return Object.is(a, b)
}
