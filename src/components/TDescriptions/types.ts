/**
 * TDescriptions / TDescriptionsItem 的属性与事件
 */

export interface TDescriptionsProps {
  /** 一行放几组「标签 + 值」。**夹到 1–4**；窄屏会自动降档（980→2 列、640→1 列） */
  column?: number
  /** 带边框的网格形态（`<el-descriptions border>`） */
  border?: boolean
  /** 标签在值的左侧（`horizontal`，默认）还是上方（`vertical`） */
  direction?: 'horizontal' | 'vertical'
  size?: 'sm' | 'md'
  title?: string
  ariaLabel?: string
}

export interface TDescriptionsItemProps {
  label: string
  /** 跨几组。用于「备注」这类要占满整行的字段 */
  span?: number
}
