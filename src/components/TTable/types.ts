/**
 * TTable / TTableColumn 的属性与事件
 *
 * 取值范围由 user-client 的实际用法决定：只出现 `show-overflow-tooltip`(12)、
 * `resizable`(8)、`fixed`(4)、`loading`(22)、`#empty`(8)、`row-key`(2)；
 * `sortable`、`type="selection"`、`type="index"`、展开行**一处都没有**，
 * 所以那些不做（清单见 `doc/架构.md` 末节）。
 */

import type { ComponentSize } from '../../types/common'

export interface TTableProps {
  /** 行数据 */
  data?: readonly unknown[]
  /** 行的稳定标识。给字符串时按该字段取值；也可以给函数 */
  rowKey?: string | ((row: unknown, index: number) => string | number)
  /** 斑马纹 */
  stripe?: boolean
  /** 竖线框。源页面里给 `el-table` 传 `border` 只是为了打开列宽拖拽 */
  border?: boolean
  /** 加载中：盖一层遮罩，表格骨架保留（不会整块消失引起跳动） */
  loading?: boolean
  /** 空态文案。要用自定义空态就传 `#empty` 插槽 */
  emptyText?: string
  size?: ComponentSize
  /** 无障碍名称。表格没有可见标题时应该给一个 */
  ariaLabel?: string
}

export interface TTableColumnProps {
  /** 取值路径，支持 `a.b.c`。给了它才有 `value` 传给单元格插槽 */
  prop?: string
  label?: string
  /** 固定列宽（px 或任意 CSS 长度） */
  width?: number | string
  /** 最小列宽。宽度没给足时用它，剩余空间按比例分给没有宽度的列 */
  minWidth?: number | string
  /**
   * 固定在左/右边缘。**必须同时给 `width`**：固定列的位置靠累加声明的宽度算出来，
   * 宽度没声明时偏移会对不上（见 `TTable.vue` 顶部）。
   */
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  /** 表头对齐，默认跟随 `align` */
  headerAlign?: 'left' | 'center' | 'right'
  /**
   * 内容超出时省略，并把完整文本放到原生 `title` 上。
   * 刻意**不用自绘气泡**：原生 `title` 零依赖、可被读屏朗读、也不会在触屏上与长按冲突。
   */
  showOverflowTooltip?: boolean
  /** 可拖动表头右边缘调整列宽 */
  resizable?: boolean
}

export interface TTableColumnEmits {
  (e: 'resize', width: number): void
}
