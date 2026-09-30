import type { InjectionKey, Ref } from 'vue'
import type { ComponentSize } from '../../types/common'
import type { FieldValidateState, Rules, ValidateTrigger } from './validate'

/**
 * 表单 → 表单项的能力。
 *
 * 用 `provide` / `inject` 而不是 props 逐层传：一个表单可能套三层布局，
 * 层层透传 `model` 与 `rules` 会把中间那些只管版式的组件也污染上表单参数。
 */
export interface FormContext {
  model: Record<string, unknown>
  rules: Record<string, Rules>
  labelWidth: string | number | undefined
  labelPosition: 'top' | 'left'
  size: ComponentSize
  disabled: boolean
  /** 表单项挂载时注册自己，表单据此知道有哪些字段要校验 */
  addField: (field: FormField) => void
  removeField: (field: FormField) => void
}

/** 表单持有的一个字段句柄 */
export interface FormField {
  prop: string
  /** 本项当前生效的规则（已合并表单级与本项级） */
  getRules: () => Rules
  /** 按时机校验本项；resolve 的是「这项通过了吗」 */
  validate: (trigger: ValidateTrigger) => Promise<boolean>
  clearValidate: () => void
  /** 本项根元素的取法，用于「滚动到第一个错误」（此刻 Dom 可能还没挂上） */
  getElement: () => HTMLElement | null
}

/**
 * 表单项 → 内部控件的能力。
 *
 * `TInput` 这类控件注入它，就能自动拿到
 * “失焦即校验 / 变化即校验”、`id` 关联、`aria-invalid`、整表禁用态。
 * 写新控件时注入这个即可，不必知道表单是怎么组织的。
 */
export interface FormItemContext {
  /** 赋给控件 `<input id>`，与 `<label for>` 配对 */
  inputId: string
  /** 错误提示元素的 id，控件应挂到 `aria-describedby` 上 */
  errorId: string
  /** 当前校验状态 */
  state: Ref<FieldValidateState>
  /** 当前错误文案 */
  errorMessage: Ref<string>
  /** 本项是否必填，控件可据此决定是否标必填样式 */
  required: Ref<boolean>
  /** 整表禁用态（表单项自己的禁用逻辑已合并进来） */
  disabled: Ref<boolean>
  size: Ref<ComponentSize>
  /** 控件在「该校验了」时调用它；表单项会按 `trigger` 过滤规则 */
  notify: (trigger: ValidateTrigger) => void
}

export const FORM_CONTEXT: InjectionKey<FormContext> = Symbol('t73-form')
export const FORM_ITEM_CONTEXT: InjectionKey<FormItemContext> = Symbol('t73-form-item')
