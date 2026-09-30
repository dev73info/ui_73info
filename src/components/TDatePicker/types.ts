/**
 * TDatePicker 的属性与事件
 */

import type { ComponentSize } from '../../types/common'

export type DatePickerType = 'date' | 'datetime' | 'daterange'

/** 单个日期。`string` 的格式由 `valueFormat` 决定 */
export type DatePickerValue = string | number | Date | null

/** 区间。两端都可以是 `null`（只选了一头） */
export type DatePickerRangeValue = [DatePickerValue, DatePickerValue]

export interface TDatePickerProps {
  /**
   * 绑定值。
   * - `type="date"` / `"datetime"` → 单个值
   * - `type="daterange"` → 两元数组
   */
  modelValue?: DatePickerValue | DatePickerRangeValue
  type?: DatePickerType
  /**
   * **绑定值的格式**。给了它，值就是按这个格式串的字符串
   * （源页面的 `value-format="YYYYMMDD"` 就是这种用法）；
   * 不给时，`type="date"` / `"daterange"` 绑 `YYYY-MM-DD` 字符串，
   * `type="datetime"` 绑 `YYYY-MM-DD HH:mm:ss` 字符串。
   */
  valueFormat?: string
  /** 输入框里显示的格式。默认与 `valueFormat` 同档（前者没给时用默认档） */
  format?: string
  placeholder?: string
  /** `daterange` 的起止占位文案 */
  startPlaceholder?: string
  endPlaceholder?: string
  disabled?: boolean
  clearable?: boolean
  size?: ComponentSize
  /** 禁用某些日期。返回 `true` 的日期不可选、置灰 */
  disabledDate?: (date: Date) => boolean
  /** 面板位置，默认 `bottom-start` */
  placement?: 'bottom-start' | 'bottom' | 'bottom-end' | 'top-start' | 'top' | 'top-end'
  /** 面板打开时默认停留的月份。默认是当前值所在月，没有值就是本月 */
  defaultMonth?: Date
  id?: string
  name?: string
  ariaLabel?: string
}

export interface TDatePickerEmits {
  (e: 'update:modelValue', value: DatePickerValue | DatePickerRangeValue): void
  (e: 'change', value: DatePickerValue | DatePickerRangeValue): void
  (e: 'clear'): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  /** 面板里显示的月份变了（翻月、选年选月都会触发） */
  (e: 'panel-change', month: Date): void
}
