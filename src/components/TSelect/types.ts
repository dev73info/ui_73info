/**
 * TSelect / TOption / TOptionGroup 的属性与事件
 *
 * 命名与 Element Plus 的对照见下面每个字段的注释；类型命名不照搬 Element 的
 * `SelectOption`，避免与「一个选项」这个更朴素的概念混淆。
 */

import type { ComponentSize } from '../../types/common'

/** 选项的值。仓库里的下拉都是字符串/数字这类原始值，因此限定为原始值 */
export type SelectValue = string | number | boolean | null

/** `v-model` 的类型：单选是一个值，多选是值数组 */
export type SelectModelValue = SelectValue | SelectValue[]

/** 数据驱动的选项（对应 `<el-option>` 的 `label` / `value` / `disabled`） */
export interface SelectOptionItem {
  label: string
  value: SelectValue
  disabled?: boolean
}

export interface TSelectProps {
  /** 选中值。多选时传数组 */
  modelValue?: SelectModelValue
  /**
   * 数据驱动的选项表。与插槽写法二选一：
   * - `<TSelect :options="list" />` —— 迁移 `<el-select :options="list" />`
   * - `<TSelect><TOption v-for="…" /></TSelect>` —— 迁移 `<el-select><el-option v-for="…" /></el-select>`
   *
   * 两种可以混用（插槽会渲染在 `options` 之后），但不必混用。
   */
  options?: SelectOptionItem[]
  /** 多选（`el-select multiple`） */
  multiple?: boolean
  /** 可清除（`el-select clearable`） */
  clearable?: boolean
  /** 可输入过滤（`el-select filterable`） */
  filterable?: boolean
  disabled?: boolean
  loading?: boolean
  placeholder?: string
  size?: ComponentSize
  /** 多选时最多渲染几个芯片，其余折成 `+N`。默认不限 */
  maxTagCount?: number
  /** 面板最小宽度对齐触发器。默认 `true`（下拉的常规形态） */
  fitInputWidth?: boolean
  /** 无匹配项时的文案 */
  noMatchText?: string
  /** 完全没有选项时的文案 */
  noDataText?: string
  /**
   * 过滤后最多渲染多少个选项，`0` 表示不限。默认 200。
   *
   * 只对 `filterable` 生效：不可过滤时截断会让后面的选项永远选不到。
   * 选项上千时（例如渠道银行字典 5260 条）全量渲染会让打开面板与每次输入都卡住，
   * 见组件头部「与 Element 的差异」里的虚拟化一条。
   */
  maxVisibleOptions?: number
  /** 选项被截断时的提示文案 */
  moreText?: string
  /** 传给原生控件的 `name` / `id`（表单上下文里会自动取到 `id`） */
  name?: string
  id?: string
  ariaLabel?: string
  /** 面板位置，默认 `bottom-start` */
  placement?: 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end'
}

export interface TSelectEmits {
  (e: 'update:modelValue', value: SelectModelValue): void
  /** 用户改选后触发（程序化改 `modelValue` 不触发，与 Element 一致） */
  (e: 'change', value: SelectModelValue): void
  (e: 'clear'): void
  (e: 'visible-change', open: boolean): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'remove-tag', value: SelectValue): void
}

export interface TSelectInstance {
  focus: () => void
  blur: () => void
  open: () => void
  close: () => void
}

export interface TOptionProps {
  /** 这一项代表的值 */
  value: SelectValue
  /**
   * 显示文本。不传时取插槽渲染出来的可见文本——
   * 与 `<el-option label="…">` 省略 label 时的行为一致。
   */
  label?: string
  disabled?: boolean
}

export interface TOptionEmits {
  (e: 'select', value: SelectValue): void
}

export interface TOptionGroupProps {
  label: string
  disabled?: boolean
}
