<script setup lang="ts">
/**
 * TTable
 *
 * 接替 `<el-table>`（user_client 里 7 张表 / 66 处 `el-table-column`）。
 * 规格来自 `.dev-table`（`dev-base.css`）：
 *
 * ```css
 * --el-table-header-bg-color: #f2f5fb;      →  --73-table-header-bg
 * --el-table-header-text-color: var(--dev-muted);
 * --el-table-text-color: var(--dev-ink);
 * --el-table-row-hover-bg-color: #f4f6fd;   →  --73-table-row-hover
 * --el-table-tr-bg-color: var(--dev-surface-strong);
 * th { height: 44px; font-size: 12px; font-weight: 700; letter-spacing: .02em }
 * td { padding: 12px 0 }  .cell { padding: 0 12px }
 * .el-table__empty-block { min-height: 112px }
 * ```
 *
 * 那一段注释里记着一件**必须守住的事**：行底色、表头底色、斑马纹都必须是
 * **合成后的不透明值**。Element 的固定列靠 `background: inherit` 从行上取底色，
 * 半透明底色会让横向滚动的内容从固定列底下透出来。这里的令牌层已经把它们
 * 算成了不透明值（见 `tokens.css` 第 2 节）。
 *
 * ## 列宽怎么算
 *
 * `<el-table>` 用 `table-layout: fixed` + 自己的一套分配算法。这里做同一件事，
 * 但规则写死成三步，便于预期：
 *
 * 1. **声明了 `width` 的列**：就用它（拖动后以拖动值为准）。
 * 2. **声明了 `minWidth` 的列**：先占 `minWidth`，再把容器的剩余宽度**按 `minWidth`
 *    的比例**分给它。
 * 3. **什么都没声明的列**：按 120px 当作 `minWidth` 参与第 2 步。
 *
 * 容器宽度用 `ResizeObserver` 量。容器比各列下限之和还窄时，表格就取那个下限之和
 * ——于是外层容器横向滚动，列不会被压成一字一行。
 *
 * ## 固定列的两个约束
 *
 * - **必须声明 `width`**。固定列的位置靠累加同侧各列的宽度算出来，
 *   没有宽度就没法算（源页面里那个 `fixed="right"` 的操作列给了 `width="118"`，
 *   正好满足）。
 * - **底色必须不透明**。理由见上面那一段。
 *
 * ## 键盘与无障碍
 *
 * 表格是一张普通的数据表，**不接管键盘**（没有 `role="grid"` 的单元格导航）——
 * 那需要一整套 roving tabindex，而仓库里的表格交互都发生在行内按钮上，
 * 按钮本来就 Tab 得到。给一个 `aria-label` 说明这张表是什么就够了。
 */
import {
  computed,
  defineComponent,
  onMounted,
  onScopeDispose,
  provide,
  ref,
  type CSSProperties,
  type PropType,
  type VNodeChild,
} from 'vue'
import type { ComponentSize } from '../../types/common'
import { TEmpty } from '../TEmpty'
// 纯函数复用：按 `a.b.c` 路径取值。它住在 TForm 里（表单校验也要用），
// 但本身与表单无关，表格取单元格值要的是同一个规则。
import { getValueByPath } from '../TForm/validate'
import {
  TABLE_CONTEXT,
  type RegisteredColumn,
  type TableCellScope,
  type TableContext,
} from './context'
import type { TTableProps } from './types'

defineOptions({ name: 'TTable' })

const props = withDefaults(defineProps<TTableProps>(), {
  data: () => [],
  rowKey: undefined,
  stripe: false,
  border: false,
  loading: false,
  emptyText: '暂无数据',
  size: 'md',
  ariaLabel: undefined,
})

/* ---------- 列注册 ---------- */

const columns = ref<RegisteredColumn[]>([])

provide<TableContext>(TABLE_CONTEXT, {
  columns,
  register: (column) => {
    const index = columns.value.findIndex((current) => current.id === column.id)
    if (index >= 0) columns.value.splice(index, 1)
    columns.value.push(column)
  },
  unregister: (id) => {
    const index = columns.value.findIndex((current) => current.id === id)
    if (index >= 0) columns.value.splice(index, 1)
  },
})

/* ---------- 列宽 ---------- */

/** 没有任何宽度声明的列按这个宽度参与分配 */
const DEFAULT_MIN_WIDTH = 120
/** 拖动时不允许把列压到比这更窄 */
const MIN_RESIZABLE_WIDTH = 48

const scrollRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)

function toPx(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined
  if (typeof value === 'number') return value
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

/** 每列「声明的」宽度：拖动值优先于 `width`。为 `undefined` 表示这一列是弹性的 */
function declaredWidths(): Array<number | undefined> {
  return columns.value.map(
    (column) => column.getResizedWidth() ?? toPx(column.props.width),
  )
}

/** 每列的下限宽度 */
function lowerBounds(): number[] {
  return columns.value.map((column) => {
    const declared = column.getResizedWidth() ?? toPx(column.props.width)
    if (declared !== undefined) return Math.max(declared, MIN_RESIZABLE_WIDTH)
    return toPx(column.props.minWidth) ?? DEFAULT_MIN_WIDTH
  })
}

const widths = computed<number[]>(() => {
  const declared = declaredWidths()
  const bounds = lowerBounds()

  const flexIndexes = declared
    .map((width, index) => (width === undefined ? index : -1))
    .filter((index) => index >= 0)
  const declaredTotal = declared.reduce<number>((sum, width) => sum + (width ?? 0), 0)
  const flexTotal = flexIndexes.reduce<number>((sum, index) => sum + (bounds[index] ?? 0), 0)

  const result = declared.map<number>(
    (width, index) => width ?? bounds[index] ?? DEFAULT_MIN_WIDTH,
  )

  // 容器比各列下限之和还窄时不多分：表格取下限之和，交给外层横向滚动
  const available = Math.max(containerWidth.value, declaredTotal + flexTotal)
  const surplus = available - declaredTotal - flexTotal

  if (surplus > 0 && flexTotal > 0) {
    for (const index of flexIndexes) {
      const bound = bounds[index] ?? DEFAULT_MIN_WIDTH
      result[index] = bound + Math.round(surplus * (bound / flexTotal))
    }
  }

  return result
})

const totalWidth = computed(() => widths.value.reduce<number>((sum, width) => sum + width, 0))

function colStyle(index: number): Record<string, string> {
  return { width: `${widths.value[index] ?? DEFAULT_MIN_WIDTH}px` }
}

/* ---------- 固定列 ---------- */

const isFixed = (column: RegisteredColumn): boolean => column.props.fixed !== undefined

/**
 * 固定列的偏移量：同侧固定列、位于本列「外侧」的那些宽度之和。
 * 右侧固定列从 0 向左累加，左侧固定列从 0 向右累加。
 */
function stickyStyle(index: number): Record<string, string> | undefined {
  const column = columns.value[index]
  const side = column?.props.fixed
  if (!side) return undefined

  let offset = 0
  if (side === 'right') {
    for (let i = index + 1; i < columns.value.length; i += 1) {
      if (columns.value[i]?.props.fixed === 'right') offset += widths.value[i] ?? 0
    }
    return { position: 'sticky', right: `${offset}px`, zIndex: '1' }
  }

  for (let i = 0; i < index; i += 1) {
    if (columns.value[i]?.props.fixed === 'left') offset += widths.value[i] ?? 0
  }
  return { position: 'sticky', left: `${offset}px`, zIndex: '1' }
}

const hasFixed = computed(() => columns.value.some(isFixed))

/* ---------- 表头拖拽调宽 ---------- */

interface ResizeState {
  column: RegisteredColumn
  index: number
  startX: number
  startWidth: number
  min: number
}

const resizing = ref<ResizeState | null>(null)

function startResize(event: PointerEvent, column: RegisteredColumn, index: number): void {
  if (event.button !== 0) return
  event.preventDefault()

  const handle = event.currentTarget as HTMLElement
  const state: ResizeState = {
    column,
    index,
    startX: event.clientX,
    startWidth: widths.value[index] ?? DEFAULT_MIN_WIDTH,
    min: Math.max(toPx(column.props.minWidth) ?? MIN_RESIZABLE_WIDTH, MIN_RESIZABLE_WIDTH),
  }
  resizing.value = state
  handle.setPointerCapture(event.pointerId)

  const onMove = (moveEvent: PointerEvent): void => {
    const next = Math.max(state.min, state.startWidth + (moveEvent.clientX - state.startX))
    state.column.setResizedWidth(next)
  }

  const onEnd = (): void => {
    const width = state.column.getResizedWidth()
    if (width !== undefined) state.column.notifyResize(width)
    resizing.value = null
    handle.releasePointerCapture(event.pointerId)
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onEnd)
    handle.removeEventListener('pointercancel', onEnd)
  }

  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onEnd)
  handle.addEventListener('pointercancel', onEnd)
}

/* ---------- 单元格 ---------- */

/** 没有插槽时的兜底显示 */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * 单元格渲染器。
 *
 * 写成独立组件而不是把插槽内容塞进 `v-for` 里：`TTableColumn` 的插槽存在于
 * **那一列**的渲染上下文里，只能从列组件自己的 `slots` 取。传一个 `(scope) => VNode`
 * 上来再在这里调用，等价于把插槽「搬」到正确的行上。
 */
const CellRenderer = defineComponent({
  name: 'TTableCell',
  props: {
    column: { type: Object as PropType<RegisteredColumn>, required: true },
    row: { type: null as unknown as PropType<unknown>, required: true },
    index: { type: Number, required: true },
  },
  setup(renderProps) {
    return (): VNodeChild => {
      const { column, row, index } = renderProps
      const value = column.props.prop ? getValueByPath(row, column.props.prop) : undefined
      const scope: TableCellScope = { row, index, value }
      const rendered = column.renderCell(scope)
      // 没有 `#default` 插槽时退回显示值本身
      if (rendered === undefined || (Array.isArray(rendered) && rendered.length === 0)) {
        return formatCell(value)
      }
      return rendered
    }
  },
})

const HeaderRenderer = defineComponent({
  name: 'TTableHeadCell',
  props: {
    column: { type: Object as PropType<RegisteredColumn>, required: true },
  },
  setup(renderProps) {
    return (): VNodeChild => {
      const rendered = renderProps.column.renderHeader()
      if (rendered === undefined || (Array.isArray(rendered) && rendered.length === 0)) {
        return renderProps.column.props.label ?? ''
      }
      return rendered
    }
  },
})

function valueOf(row: unknown, column: RegisteredColumn): unknown {
  return column.props.prop ? getValueByPath(row, column.props.prop) : undefined
}

/** `show-overflow-tooltip` 时把完整文本挂到 `title` 上 */
function titleOf(row: unknown, column: RegisteredColumn): string | undefined {
  if (!column.props.showOverflowTooltip) return undefined
  const text = formatCell(valueOf(row, column))
  return text.length > 0 ? text : undefined
}

function alignOf(column: RegisteredColumn, header: boolean): CSSProperties['textAlign'] {
  if (header) return column.props.headerAlign ?? column.props.align ?? 'left'
  return column.props.align ?? 'left'
}

/* ---------- 行 key ---------- */

function rowKeyOf(row: unknown, index: number): string | number {
  const key = props.rowKey
  if (typeof key === 'function') return key(row, index)
  if (typeof key === 'string') {
    const value = getValueByPath(row, key)
    if (typeof value === 'string' || typeof value === 'number') return value
  }
  return index
}

/* ---------- 容器宽度测量 ---------- */

let observer: ResizeObserver | undefined

onMounted(() => {
  const el = scrollRef.value
  if (!el) return
  containerWidth.value = el.clientWidth
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => {
      containerWidth.value = el.clientWidth
    })
    observer.observe(el)
  }
})

onScopeDispose(() => {
  observer?.disconnect()
  observer = undefined
})

const classes = computed(() => [
  't73-table',
  't73',
  `t73-table--${props.size satisfies ComponentSize}`,
  {
    't73-table--stripe': props.stripe,
    't73-table--border': props.border,
    't73-table--fixed': hasFixed.value,
    't73-table--resizing': resizing.value !== null,
  },
])

const isEmpty = computed(() => props.data.length === 0)
</script>

<template>
  <div :class="classes" :aria-busy="loading ? 'true' : undefined">
    <!--
      列声明挂在这里。它必须是**挂载**的（`onMounted` 才会注册），
      但不需要被看见；`display: none` 不影响 Vue 组件挂载。
      这与 Element 的 `.hidden-columns` 是同一个做法。
    -->
    <div class="t73-table__columns" aria-hidden="true"><slot /></div>

    <div ref="scrollRef" class="t73-table__scroll">
      <table class="t73-table__table" :aria-label="ariaLabel" :style="{ width: `${totalWidth}px` }">
        <colgroup>
          <col v-for="(column, index) in columns" :key="column.id" :style="colStyle(index)" />
        </colgroup>

        <thead>
          <tr>
            <th
              v-for="(column, index) in columns"
              :key="column.id"
              class="t73-table__th"
              :class="{
                't73-table__cell--fixed': column.props.fixed,
                't73-table__cell--ellipsis': column.props.showOverflowTooltip,
              }"
              :style="[stickyStyle(index), { textAlign: alignOf(column, true) }]"
              scope="col"
            >
              <div class="t73-table__cell">
                <HeaderRenderer :column="column" />
              </div>
              <span
                v-if="column.props.resizable"
                class="t73-table__resizer"
                :class="{ 't73-table__resizer--active': resizing?.column.id === column.id }"
                aria-hidden="true"
                @pointerdown="startResize($event, column, index)"
              />
            </th>
          </tr>
        </thead>

        <tbody v-if="!isEmpty">
          <tr
            v-for="(row, rowIndex) in data"
            :key="rowKeyOf(row, rowIndex)"
            class="t73-table__row"
          >
            <td
              v-for="(column, index) in columns"
              :key="column.id"
              class="t73-table__td"
              :class="{
                't73-table__cell--fixed': column.props.fixed,
                't73-table__cell--ellipsis': column.props.showOverflowTooltip,
              }"
              :style="[stickyStyle(index), { textAlign: alignOf(column, false) }]"
              :title="titleOf(row, column)"
            >
              <div class="t73-table__cell">
                <CellRenderer :column="column" :row="row" :index="rowIndex" />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="isEmpty && !loading" class="t73-table__empty">
        <slot name="empty">
          <TEmpty :description="emptyText" />
        </slot>
      </div>
    </div>

    <!-- 加载遮罩盖在滚动区上：表格骨架保留，避免加载完成时整块跳动 -->
    <div v-if="loading" class="t73-table__mask">
      <span class="t73-table__spinner" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.t73-table {
  position: relative;
  width: 100%;
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  color: var(--73-ink);
}

/* 列声明容器：不占位、不可见，只为了让列组件挂载 */
.t73-table__columns {
  display: none;
}

.t73-table__scroll {
  width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

.t73-table__table {
  /* fixed 布局：列宽完全由 colgroup 决定，单元格内容不会把列撑开 */
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0;
}

.t73-table__row {
  background: var(--73-surface-strong);
}

.t73-table--stripe .t73-table__row:nth-child(even) {
  background: var(--73-table-stripe);
}

.t73-table__row:hover {
  /* 不透明底色：固定列靠继承行底色，半透明会在横向滚动时透出来 */
  background: var(--73-table-row-hover);
}

.t73-table__th,
.t73-table__td {
  padding: 0;
  text-align: left;
  vertical-align: middle;
}

.t73-table__th {
  position: relative;
  height: 44px;
  background: var(--73-table-header-bg);
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
  font-weight: var(--73-font-weight-bold);
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.t73-table__td {
  padding: 12px 0;
  border-bottom: 1px solid var(--73-border-soft);
}

.t73-table__cell {
  min-width: 0;
  padding: 0 12px;
}

.t73-table__cell--ellipsis .t73-table__cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 固定列：底色必须不透明（见组件顶部），并把内侧描边画出来 */
.t73-table__cell--fixed {
  background: inherit;
}

.t73-table__th.t73-table__cell--fixed {
  background: var(--73-table-header-bg);
  z-index: 2;
}

.t73-table__td.t73-table__cell--fixed {
  z-index: 1;
}

.t73-table--border .t73-table__th + .t73-table__th,
.t73-table--border .t73-table__td + .t73-table__td {
  border-left: 1px solid var(--73-border-soft);
}

/* --- 表头拖拽手柄 --- */
.t73-table__resizer {
  position: absolute;
  top: 0;
  right: -4px;
  z-index: 3;
  width: 9px;
  height: 100%;
  cursor: col-resize;
  /* 触屏上拖动时不要触发页面滚动 */
  touch-action: none;
}

.t73-table__resizer::after {
  content: '';
  position: absolute;
  top: 25%;
  left: 4px;
  width: 1px;
  height: 50%;
  background: transparent;
  transition: background-color var(--73-transition);
}

.t73-table__resizer:hover::after,
.t73-table__resizer--active::after {
  background: var(--73-accent);
}

.t73-table--resizing {
  cursor: col-resize;
  /* 拖动期间别让整页被选中 */
  user-select: none;
}

/* --- 空态与加载态 --- */
.t73-table__empty {
  min-height: 112px;
  padding: 16px 12px;
}

.t73-table__mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--73-surface-strong) 72%, transparent);
}

.t73-table__spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--73-accent-line);
  border-top-color: var(--73-accent);
  border-radius: 50%;
  animation: t73-table-spin 700ms linear infinite;
}

@keyframes t73-table-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
