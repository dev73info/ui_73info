/**
 * 表格上下文
 *
 * 列从上下文注册到表格，而不是表格去读自己的 children —— 与 `TForm` / `TSelect`
 * 同一思路。好处是列可以被包在任意的 `v-for` / 条件渲染里，
 * 表格不必知道中间隔了几层。
 */

import type { InjectionKey, Ref, VNodeChild } from 'vue'
import type { TTableColumnProps } from './types'
/** 单元格渲染时交给插槽的作用域 */
export interface TableCellScope {
  row: unknown
  index: number
  /** 按 `prop` 从行里取到的值 */
  value: unknown
}

export interface RegisteredColumn {
  /** 由 `TTableColumn` 用 `useId()` 生成的稳定 id */
  id: string
  props: Readonly<TTableColumnProps>
  /** 渲染单元格。没有默认插槽时返回 `undefined`，由表格回退到显示值本身 */
  renderCell: (scope: TableCellScope) => VNodeChild
  /** 渲染表头。没有 `#header` 插槽时返回 `undefined` */
  renderHeader: () => VNodeChild
  /**
   * 拖动表头边缘后的本地列宽。`undefined` 表示还没拖过。
   *
   * **刻意用一对取值/写值函数，而不是直接放一个 `Ref`。** 列要登记进表格的
   * `ref<RegisteredColumn[]>`，而 Vue 的 `ref()` 会对内部做**深度响应式代理**，
   * 代理访问时会把嵌套的 `Ref` 解包成它的值。放 `Ref` 进去的结果就是：
   * 类型上说是 `Ref`、运行时拿到的是 `number`，两处都对不上。
   * 换成函数之后，函数本身不会被代理改写，而函数体里读的那个 `Ref`
   * 照样被追踪，响应式一点没丢。
   */
  getResizedWidth: () => number | undefined
  setResizedWidth: (width: number) => void
  /** 列宽被拖动后通知列自己（列据此把 `resize` 事件抛给调用方） */
  notifyResize: (width: number) => void
}

export interface TableContext {
  /** 注册顺序即渲染顺序 */
  columns: Ref<RegisteredColumn[]>
  register: (column: RegisteredColumn) => void
  unregister: (id: string) => void
}

export const TABLE_CONTEXT: InjectionKey<TableContext> = Symbol('t73-table')
