<script setup lang="ts">
/**
 * TTableColumn
 *
 * 一列。接替 `<el-table-column>`（user-client 里 66 处 / 40 个标签）。
 *
 * ## 它只是一个「声明」
 *
 * 这个组件不渲染任何东西——它把自己的属性、`#default` 插槽、`#header` 插槽
 * 打包成一条记录交给 `TTable`，由表格在自己的 `<tr>` 里摆位置。
 * 所以它必须放在 `TTable` 里，且**不要给它加 `class` / `style`**（没有落点）。
 *
 * ## 单元格插槽的作用域
 *
 * ```vue
 * <TTableColumn prop="amount" label="金额">
 *   <template #default="{ row, index, value }">¥{{ value }}</template>
 * </TTableColumn>
 * ```
 *
 * 与 `<el-table-column>` 的 `#default="scope"` 差异：这里作用域是**解构好的**
 * `{ row, index, value }`，不是 `{ row, $index, column }`。
 * 迁移时把 `scope.row` 换成 `row`、`scope.$index` 换成 `index` 即可。
 * `value` 是按 `prop` 取好的值，省掉每处写 `row[prop]`。
 *
 * 不给 `#default` 时单元格显示值本身（`null` / `undefined` 显示空）。
 */
import { inject, onMounted, onScopeDispose, ref, useId, useSlots } from 'vue'
import { TABLE_CONTEXT, type RegisteredColumn, type TableCellScope } from './context'
import type { TTableColumnEmits, TTableColumnProps } from './types'

defineOptions({ name: 'TTableColumn' })

const props = withDefaults(defineProps<TTableColumnProps>(), {
  prop: undefined,
  label: undefined,
  width: undefined,
  minWidth: undefined,
  fixed: undefined,
  align: 'left',
  headerAlign: undefined,
  showOverflowTooltip: false,
  resizable: false,
})

const emit = defineEmits<TTableColumnEmits>()

const table = injectTable()
const slots = useSlots()
const id = useId()

/** 拖动表头边缘后的列宽。`undefined` 表示还没拖过 */
const resizedWidth = ref<number | undefined>(undefined)

function injectTable() {
  const injected = inject(TABLE_CONTEXT, null)
  if (!injected) {
    throw new Error(
      '[ui_73info] TTableColumn 必须放在 TTable 内使用：它不是独立渲染的组件，只是给表格的一条列声明。',
    )
  }
  return injected
}

const column: RegisteredColumn = {
  id,
  // props 是响应式代理，表格读到的永远是最新值
  props,
  renderCell: (scope: TableCellScope) => slots.default?.(scope),
  renderHeader: () => slots.header?.(),
  getResizedWidth: () => resizedWidth.value,
  setResizedWidth: (width: number) => {
    resizedWidth.value = width
  },
  notifyResize: (width: number) => emit('resize', width),
}

onMounted(() => {
  table.register(column)
})

onScopeDispose(() => {
  table.unregister(id)
})
</script>

<template>
  <!-- 列声明没有可视输出：内容全部由 TTable 的 thead / tbody 渲染 -->
  <span v-if="false" hidden />
</template>
