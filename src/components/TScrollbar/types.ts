/**
 * TScrollbar 的属性与事件
 */

export interface TScrollbarProps {
  /** 最大高度，超出滚动 */
  maxHeight?: string | number
  /** 最大宽度，超出横向滚动 */
  maxWidth?: string | number
  /** 一直显示滚动条，而不是悬浮/滚动时才出现 */
  always?: boolean
  /**
   * 用浏览器原生滚动条。
   * **触屏设备上建议打开**：原生滚动自带惯性、边缘回弹与「滚动时收起地址栏」，
   * 自绘滚动条都做不到。
   */
  native?: boolean
  /** 内容变化后是否自动重算滚动条尺寸，默认 `true`。内容异步填充时保持开启 */
  watchContent?: boolean
  ariaLabel?: string
}

export interface TScrollbarEmits {
  (e: 'scroll', event: Event): void
}

export interface TScrollbarInstance {
  /** 内部真正滚动的那个元素。迁移自 `document.querySelector('.el-scrollbar__wrap')` 的代码用这个 */
  wrapRef: () => HTMLElement | null
  setScrollTop: (value: number) => void
  setScrollLeft: (value: number) => void
  update: () => void
}
