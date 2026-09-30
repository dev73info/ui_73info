import type { ComponentSize } from '../../types/common'

export type TInputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'

export interface TInputProps {
  /** 值。**始终以字符串发出**（`update:modelValue`），与原生 `<input>` 一致。 */
  modelValue?: string | number | null
  type?: TInputType
  size?: ComponentSize
  placeholder?: string
  disabled?: boolean
  readonly?: boolean
  /**
   * 强制错误态。不传时自动跟随所在 `TFormItem` 的校验状态
   * ——这是绝大多数情况，组件会自动挂上 `aria-invalid` 与错误描边。
   */
  invalid?: boolean
  /** 有值时在右侧出现清除按钮 */
  clearable?: boolean
  maxlength?: number
  /** 在右下角显示 `已输入/上限` 计数。需要同时传 `maxlength`。 */
  showCount?: boolean
  autocomplete?: string
  /** 原生 `name`，表单序列化用 */
  name?: string
  /** 覆盖 `id`；不传时用 `TFormItem` 分配的 id，以便 `<label for>` 关联 */
  id?: string
  /** 无可见标签时的无障碍名称 */
  ariaLabel?: string
  autofocus?: boolean
}

export interface TInputEmits {
  (e: 'update:modelValue', value: string): void
  /** 值变化并失焦，或按回车时触发 */
  (e: 'change', value: string): void
  (e: 'input', value: string): void
  (e: 'clear'): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'enter', event: KeyboardEvent): void
}
