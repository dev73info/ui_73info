/**
 * TSwitch 的属性与事件
 */

import type { ComponentSize } from '../../types/common'

export interface TSwitchProps {
  /** 开关状态。**只支持布尔**：仓库里的两处开关都是布尔语义，
   *  多态值（`activeValue` / `inactiveValue`）需要调用方自己映射，本组件不做 */
  modelValue?: boolean
  disabled?: boolean
  /**
   * 提交中。视觉上保留当前状态、只是不接受点击，且**不发出** `update:modelValue`
   * ——由调用方在请求成功后再改 `modelValue`（源页面的自动提现开关就是这个用法）。
   */
  loading?: boolean
  size?: ComponentSize
  /** 开启时轨道旁的文案 */
  activeText?: string
  /** 关闭时轨道旁的文案 */
  inactiveText?: string
  id?: string
  name?: string
  ariaLabel?: string
}

export interface TSwitchEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
}
