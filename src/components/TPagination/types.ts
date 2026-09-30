/**
 * TPagination 的属性与事件
 *
 * ## 与 `<el-pagination>` 的 `layout` 串的对照
 *
 * Element 用一个逗号串控制区块（`layout="prev, pager, next, total, sizes, jumper"`）。
 * 这里改成显式布尔：串解析出来的组合有几十种，而仓库里实际只用过
 * `prev, pager, next` 与默认两种，显式的开关更好读也更好跳转。
 *
 * | Element `layout` 片段 | 这里 |
 * | --- | --- |
 * | `total` | `show-total` |
 * | `sizes` | `show-size-changer` + `page-sizes` |
 * | `prev` / `pager` / `next` | 恒定，开关跟不出来 |
 * | `jumper` | `show-jumper` |
 * | `->`（右对齐占位） | 不需要：本组件的头部与尾部分成左右两块，本身就是两端对齐 |
 */

import type { ComponentSize } from '../../types/common'

export interface TPaginationProps {
  /** 总条数 */
  total?: number
  /** 每页条数 */
  pageSize?: number
  /** 当前页，从 1 开始 */
  currentPage?: number
  /** 可选的每页条数 */
  pageSizes?: number[]
  /**
   * 页码按钮个数上限（含首尾）。**会向上取到奇数**——
   * 偶数个按钮会出现「当前页偏左或偏右」的分歧，Element 也是这个口径。
   */
  pagerCount?: number
  /** 左侧显示「共 N 条」 */
  showTotal?: boolean
  /** 显示每页条数下拉 */
  showSizeChanger?: boolean
  /** 显示跳页输入框 */
  showJumper?: boolean
  size?: ComponentSize
  disabled?: boolean
  /** 页面按钮是否带底色。源页面里两种都有用过 */
  background?: boolean
  ariaLabel?: string
}

export interface TPaginationEmits {
  (e: 'update:currentPage', page: number): void
  (e: 'update:pageSize', size: number): void
  (e: 'change', page: number, pageSize: number): void
  (e: 'current-change', page: number): void
  (e: 'size-change', size: number): void
}
