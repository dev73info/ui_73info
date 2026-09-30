/**
 * TEmpty 的属性与事件
 */

import type { ComponentSize } from '../../types/common'

export interface TEmptyProps {
  /** 空态文案。承载必要信息（为什么空、下一步做什么），不写装饰性的「暂无数据」堆叠 */
  description?: string
  size?: ComponentSize
  /** 换成带描边的卡片形态；表格与卡片里用默认的虚线框 */
  variant?: 'dashed' | 'plain'
}

export interface TEmptySlots {
  /** 自定义图形区（默认什么都不画，仓库里的空态本来就只有一行字） */
  default?: () => unknown
  /** 覆盖文案区 */
  description?: () => unknown
}
