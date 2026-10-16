import type { ComponentSize } from '../../types/common'

export type TInputType = 'text' | 'password' | 'email' | 'number' | 'search' | 'tel' | 'url'

/**
 * 多行输入的自适应高度。
 *
 * - `true` → 按内容长高，最小 2 行
 * - `false` → 固定 `rows` 行
 * - 对象 → 单独给上下限
 */
export type TInputAutosize = boolean | { minRows?: number; maxRows?: number }

/**
 * 原生 `inputmode` 的取值：移动端软键盘该弹哪一副（数字、电话、邮箱…）。
 * 取值与 `HTMLInputElement.inputMode` 一致。
 */
export type TInputMode = 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url'

export interface TInputProps {
  /** 值。**始终以字符串发出**（`update:modelValue`），与原生 `<input>` 一致。 */
  modelValue?: string | number | null
  /**
   * 控件类型。`'textarea'` 会换成多行输入框
   * （接替 `<el-input type="textarea">`，源页面里需求描述、发布表单那些用法）。
   */
  type?: TInputType | 'textarea'
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
  autocomplete?: string
  /**
   * 移动端软键盘的形态提示（原生 `inputmode`）。银行卡号、金额这类只输数字的字段用它。
   *
   * 为什么必须声明成 prop、不能靠属性透传：本组件的根元素是外层那个包裹 `div`，
   * 未声明的属性会挂在 `div` 上（`inputmode` 对 `div` 没有任何意义），
   * 真正的输入框拿不到，手机上就不会弹数字键盘——而且这种失效不报错、也不影响外观，
   * 只有拿真机点开输入框才会发现。取值见 `TInputMode`。
   */
  inputmode?: TInputMode
  /** 原生 `name`，表单序列化用 */
  name?: string
  /** 覆盖 `id`；不传时用 `TFormItem` 分配的 id，以便 `<label for>` 关联 */
  id?: string
  /** 无可见标签时的无障碍名称 */
  ariaLabel?: string
  autofocus?: boolean
  /** 多行时的初始行数，默认 3 */
  rows?: number
  /** 多行时的高度策略，默认 `{ minRows: 2, maxRows: 8 }` */
  autosize?: TInputAutosize
  /** 多行时右下角是否可手动拖拽改变大小，默认 `'vertical'` */
  resize?: 'none' | 'vertical' | 'both'
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
