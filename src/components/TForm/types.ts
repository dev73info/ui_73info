import type { ComponentSize } from '../../types/common'
import type { Rules, ValidateTrigger } from './validate'

export interface TFormProps {
  /** 表单数据对象。校验时按 `prop` 的点号路径从它里面取值。 */
  model: Record<string, unknown>
  /** 按字段路径组织的规则表，`{ 'user.name': [{ required: true }] }`。 */
  rules?: Record<string, Rules>
  /** 标签宽度。数字按 px 处理。`labelPosition="top"` 时忽略。 */
  labelWidth?: string | number
  /** 标签位置，默认 `top`（窄屏下不必再单独适配）。 */
  labelPosition?: 'top' | 'left'
  /** 整表尺寸，默认 `md` */
  size?: ComponentSize
  /** 整表禁用 */
  disabled?: boolean
  /**
   * 提交校验失败时，滚动到第一个出错的字段，默认 `true`。
   *
   * 长表单里这是必要的：用户点提交后如果错误在屏幕外，看起来就像「点了没反应」。
   */
  scrollToError?: boolean
}

/**
 * 表单实例方法，通过模板 ref 调用：
 *
 * ```ts
 * const form = ref<TFormInstance>()
 * if (!(await form.value?.validate())) return
 * ```
 */
export interface TFormInstance {
  /**
   * 校验全部字段。
   *
   * **失败时 resolve `false`，不 reject**（与 Element Plus 不同，见 `validate.ts` 顶部对照表），
   * 所以调用方写 `if (!(await form.validate())) return` 就行，不需要 try/catch。
   */
  validate: () => Promise<boolean>
  /** 校验指定字段，不传则校验全部 */
  validateField: (props?: string | string[]) => Promise<boolean>
  /** 清掉错误提示（不重新校验） */
  clearValidate: (props?: string | string[]) => void
  /** 恢复到挂载时的初始值，并清掉错误提示 */
  resetFields: () => void
}

export interface TFormItemProps {
  /**
   * 字段路径，如 `'user.name'`。
   *
   * **参与校验的项必须给** —— 没有它表单项无法从 `model` 取值，
   * 也无法和 `TForm` 的 `rules` 表对上，于是它**不做任何校验**（当成一个纯排版项）。
   * 这个宽松档是给「一组控件的分组标签」用的：那种项只有一个可见标题，
   * 校验发生在组内各个真正的字段上。
   */
  prop?: string
  /** 标签文字。不传则不渲染标签行。 */
  label?: string
  /** 本项自己的规则，会和 `TForm` 上 `rules[prop]` 的内容合并（本项在前） */
  rules?: Rules
  /** 覆盖必填星号：不传时按规则里有没有 `required: true` 自动判断 */
  required?: boolean
  /** 标签右侧的说明文字（承载必要信息的那类，不是装饰性副标题） */
  help?: string
  /** 本项标签宽度，覆盖 `TForm` 的设置 */
  labelWidth?: string | number
  /** 本项禁用，与 `TForm` 的 `disabled` 取或 */
  disabled?: boolean
  /** 是否显示校验错误文案，默认 `true` */
  showMessage?: boolean
}
