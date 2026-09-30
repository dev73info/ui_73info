<script setup lang="ts">
/**
 * TDatePicker
 *
 * 接替 `<el-date-picker>`（user-client 里 2 处，都在实名认证表单里，
 * 用 `type="date" value-format="YYYYMMDD" format="YYYY-MM-DD"`）。
 * 零依赖意味着日历面板、三级视图切换、区间选择都要自己写。
 *
 * ## 规格来源
 *
 * 触发器沿用与 `TSelect` 完全相同的一套（源页面里 `.el-date-editor` 与
 * `.el-select__wrapper` 也是同一档：控件高 36px、10px 圆角、白底、inset 描边）。
 * 面板沿用与下拉菜单相同的浮层外观（12px 圆角、`--73-shadow-panel`）。
 * 选中格取主色底 + 反白字，今天用主色描边标出——**与选中态区分开**，
 * 否则「今天」和「选中今天」看起来一样。
 *
 * ## 三级视图
 *
 * 面板有 `day` / `month` / `year` 三层，点标题往上走一层：
 * `2026 年 9 月` → `2026 年` → `2020 – 2029`。左右箭头按当前层级步进
 * （月 → 年 → 十年）。这是选 40 年前的生日唯一可行的路径：
 * 只按「上一个月」要按 480 次。
 *
 * ## 日历网格固定 6 行
 *
 * 42 格。按月份不同生成 4/5/6 行会让面板高度在切月时跳动，
 * 鼠标位置跟着挪，连着点几下很容易点错格。
 *
 * ## 与 Element 的差异
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | 区间面板 | 两个并排日历 + 悬浮预览 | **单个日历** + 悬浮预览（窄屏上两位并排放不下） |
 * | `shortcuts` | 支持 | **未实现**（见 `doc/架构.md` 末节） |
 * | `default-time` | 支持 | 未实现；`datetime` 的时间部分取「现在」或已有值的时分秒 |
 */
import { computed, inject, nextTick, ref, useAttrs, useId, watch } from 'vue'
import { useOverlay } from '../../primitives'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import {
  MONTHS,
  WEEKDAYS,
  addMonths,
  addYears,
  formatDate,
  isSameDay,
  isSameMonth,
  monthMatrix,
  parseDate,
  startOfDay,
} from './date'
import type {
  DatePickerRangeValue,
  DatePickerValue,
  TDatePickerEmits,
  TDatePickerProps,
} from './types'

defineOptions({ name: 'TDatePicker', inheritAttrs: false })

const props = withDefaults(defineProps<TDatePickerProps>(), {
  modelValue: null,
  type: 'date',
  valueFormat: undefined,
  format: undefined,
  placeholder: '请选择日期',
  startPlaceholder: '开始日期',
  endPlaceholder: '结束日期',
  disabled: false,
  clearable: true,
  size: undefined,
  disabledDate: undefined,
  placement: 'bottom-start',
  defaultMonth: undefined,
  id: undefined,
  name: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TDatePickerEmits>()
const attrs = useAttrs()

const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()
const panelId = useId()

const isDisabled = computed(() => props.disabled || (item?.disabled.value ?? false))
const size = computed<ComponentSize>(() => props.size ?? item?.size.value ?? 'md')
const isInvalid = computed(() => (item ? item.state.value === 'error' : false))
const inputId = computed(() => props.id ?? item?.inputId ?? fallbackId)

const isRange = computed(() => props.type === 'daterange')

/** 值格式：没显式给时按 `type` 取默认档 */
const valueFormat = computed(() => props.valueFormat ?? defaultFormat.value)

const defaultFormat = computed(() => {
  switch (props.type) {
    case 'datetime':
      return 'YYYY-MM-DD HH:mm:ss'
    case 'daterange':
    case 'date':
    default:
      return 'YYYY-MM-DD'
  }
})

/** 显示格式：源页面那样 `format="YYYY-MM-DD"` + `value-format="YYYYMMDD"` 都能对上 */
const displayFormat = computed(() => props.format ?? valueFormat.value)

/* ---------- 值的解析与序列化 ---------- */

function toDate(value: DatePickerValue | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value)
  if (typeof value === 'number') return new Date(value)
  // 先按 valueFormat 解；解不出来再退回浏览器自己的解析（ISO 串这类）
  const parsed = parseDate(value, valueFormat.value)
  if (parsed) return parsed
  const fallback = new Date(value)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

function toValue(date: Date | null): DatePickerValue {
  if (!date) return null
  // 区间与单值都给字符串：字符串是唯一能在「表单初值 / 请求体 / 显示」之间
  // 无损往返的形态，`Date` 会被时区与毫秒悄悄改掉
  return formatDate(date, valueFormat.value)
}

const modelDates = computed<[Date | null, Date | null]>(() => {
  const value = props.modelValue
  if (isRange.value) {
    if (!Array.isArray(value)) return [null, null]
    const [start, end] = value as DatePickerRangeValue
    return [toDate(start), toDate(end)]
  }
  return [toDate(value as DatePickerValue), null]
})

const hasValue = computed(() => modelDates.value[0] !== null)

const displayText = computed(() => {
  const [start, end] = modelDates.value
  if (isRange.value) {
    if (!start) return ''
    // 只选了一头时显示「起 ± 」的形式，避免看起来像已经选好了完整区间
    return `${formatDate(start, displayFormat.value)} 至 ${end ? formatDate(end, displayFormat.value) : '…'}`
  }
  return start ? formatDate(start, displayFormat.value) : ''
})

/* ---------- 面板状态 ---------- */

type PanelView = 'day' | 'month' | 'year'

const view = ref<PanelView>('day')
const panelMonth = ref<Date>(startOfDay(new Date()))
/** 区间选择中：起点已选、终点待选 */
const rangeStart = ref<Date | null>(null)
/** 区间预览的悬浮日 */
const hoverDate = ref<Date | null>(null)
/** `datetime` 的时分秒草稿 */
const draftTime = ref({ hour: 0, minute: 0, second: 0 })

const {
  open,
  anchorRef,
  panelRef,
  panelStyle,
  show: showPanel,
  hide: hidePanel,
} = useOverlay({
  trigger: 'manual',
  placement: computed(() => props.placement),
  onAfterOpen: handleOpened,
  onAfterClose: handleClosed,
})

function handleOpened(): void {
  view.value = 'day'
  rangeStart.value = null
  hoverDate.value = null

  const [start] = modelDates.value
  const anchor = start ?? props.defaultMonth ?? new Date()
  panelMonth.value = new Date(anchor.getFullYear(), anchor.getMonth(), 1)

  if (props.type === 'datetime') {
    const source = start ?? new Date()
    draftTime.value = {
      hour: source.getHours(),
      minute: source.getMinutes(),
      second: source.getSeconds(),
    }
  }
  emit('panel-change', panelMonth.value)
}

function handleClosed(): void {
  rangeStart.value = null
  hoverDate.value = null
}

function openPanel(): void {
  if (isDisabled.value) return
  if (!open.value) showPanel()
}

function closePanel(): void {
  if (open.value) hidePanel('select')
}

/* ---------- 选中 ---------- */

/** 把面板当前显示的月/日与 `datetime` 的时分秒拼成一个完整时刻 */
function withDraftTime(date: Date): Date {
  if (props.type !== 'datetime') return startOfDay(date)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    draftTime.value.hour,
    draftTime.value.minute,
    draftTime.value.second,
  )
}

function commitSingle(date: Date | null): void {
  const value = toValue(date)
  emit('update:modelValue', value)
  emit('change', value)
  item?.notify('change')
}

function commitRange(start: Date | null, end: Date | null): void {
  const value: DatePickerRangeValue = [toValue(start), toValue(end)]
  emit('update:modelValue', value)
  emit('change', value)
  item?.notify('change')
}

function pickDay(date: Date): void {
  if (isDayDisabled(date)) return

  if (isRange.value) {
    if (!rangeStart.value) {
      rangeStart.value = date
      // 只选了起点：先不提交，等终点也选上再一起发
      return
    }
    const start = rangeStart.value
    // 倒着选（终点早于起点）时自动交换，否则区间是负的
    const [from, to] = start <= date ? [start, date] : [date, start]
    rangeStart.value = null
    commitRange(from, to)
    closePanel()
    return
  }

  commitSingle(withDraftTime(date))
  if (props.type === 'date') closePanel()
}

function pickMonth(month: number): void {
  panelMonth.value = new Date(panelMonth.value.getFullYear(), month, 1)
  view.value = 'day'
  emit('panel-change', panelMonth.value)
}

function pickYear(year: number): void {
  panelMonth.value = new Date(year, panelMonth.value.getMonth(), 1)
  view.value = 'month'
  emit('panel-change', panelMonth.value)
}

function pickToday(): void {
  const today = new Date()
  panelMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
  if (props.type === 'datetime') {
    draftTime.value = {
      hour: today.getHours(),
      minute: today.getMinutes(),
      second: today.getSeconds(),
    }
  }
  pickDay(today)
}

function clear(): void {
  if (isDisabled.value) return
  rangeStart.value = null
  if (isRange.value) commitRange(null, null)
  else commitSingle(null)
  emit('clear')
}

/* ---------- 网格数据 ---------- */

const days = computed(() => monthMatrix(panelMonth.value.getFullYear(), panelMonth.value.getMonth()))

const monthGrid = computed(() =>
  MONTHS.map((label, index) => ({ label, index, value: index })),
)

const yearPageStart = computed(() => Math.floor(panelMonth.value.getFullYear() / 12) * 12)

const years = computed(() =>
  Array.from({ length: 12 }, (_, index) => yearPageStart.value + index),
)

const headerLabel = computed(() => {
  const year = panelMonth.value.getFullYear()
  if (view.value === 'year') return `${yearPageStart.value} – ${yearPageStart.value + 11}`
  if (view.value === 'month') return `${year} 年`
  return `${year} 年 ${panelMonth.value.getMonth() + 1} 月`
})

function step(delta: number): void {
  if (view.value === 'day') panelMonth.value = addMonths(panelMonth.value, delta)
  else if (view.value === 'month') panelMonth.value = addYears(panelMonth.value, delta)
  else panelMonth.value = addYears(panelMonth.value, delta * 12)
  emit('panel-change', panelMonth.value)
}

/** 点标题往上一层；已经在最上层就不动 */
function zoomOut(): void {
  if (view.value === 'day') view.value = 'month'
  else if (view.value === 'month') view.value = 'year'
}

/* ---------- 单元格状态 ---------- */

const today = startOfDay(new Date())

function isDayDisabled(date: Date): boolean {
  return props.disabledDate?.(date) === true
}

function isDaySelected(date: Date): boolean {
  const [start, end] = modelDates.value
  if (rangeStart.value) return isSameDay(date, rangeStart.value)
  if (isRange.value) return isSameDay(date, start) || isSameDay(date, end)
  return isSameDay(date, start)
}

/** 区间高亮：已提交的区间 + 选择过程中的悬浮预览 */
const rangeBounds = computed<[Date | null, Date | null]>(() => {
  if (rangeStart.value && hoverDate.value) {
    const [from, to] =
      rangeStart.value <= hoverDate.value
        ? [rangeStart.value, hoverDate.value]
        : [hoverDate.value, rangeStart.value]
    return [from, to]
  }
  return [modelDates.value[0], modelDates.value[1]]
})

function isDayInRange(date: Date): boolean {
  const [from, to] = rangeBounds.value
  if (!from || !to) return false
  return date > from && date < to
}

function isDayRangeEdge(date: Date): boolean {
  const [from, to] = rangeBounds.value
  if (!from || !to) return false
  return isSameDay(date, from) || isSameDay(date, to)
}

function dayClasses(date: Date): Record<string, boolean> {
  const otherMonth = !isSameMonth(date, panelMonth.value)
  return {
    't73-date-picker__day--outside': otherMonth,
    't73-date-picker__day--today': isSameDay(date, today),
    't73-date-picker__day--selected': isDaySelected(date),
    't73-date-picker__day--in-range': isDayInRange(date),
    't73-date-picker__day--edge': isDayRangeEdge(date),
    't73-date-picker__day--disabled': isDayDisabled(date),
  }
}

/* ---------- 时分秒草稿 ---------- */

function clampTime(part: 'hour' | 'minute' | 'second', raw: string | number): void {
  const max = part === 'hour' ? 23 : 59
  const parsed = Number.parseInt(String(raw), 10)
  const next = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), max) : 0
  draftTime.value[part] = next
  // 已经选了日期就直接更新值，让面板与触发器上的文本同步
  const [start] = modelDates.value
  if (start) commitSingle(withDraftTime(start))
}

/* ---------- 触发器交互 ---------- */

function onTriggerClick(): void {
  if (isDisabled.value) return
  if (open.value) hidePanel('api')
  else showPanel()
}

function onKeydown(event: KeyboardEvent): void {
  if (isDisabled.value) return
  if (!open.value) {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault()
      showPanel()
    }
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    hidePanel('api')
  }
}

function onFocusIn(event: FocusEvent): void {
  emit('focus', event)
}

function onFocusOut(event: FocusEvent): void {
  emit('blur', event)
  // 焦点从触发器移进面板（面板是 Teleport 到 body 的，所以触发器会先收到一次
  // focusout）不算「失焦」，否则一打开面板就把表单校验触发了。
  const next = event.relatedTarget
  if (next instanceof Node && panelRef.value?.contains(next)) return
  item?.notify('blur')
}

/**
 * 面板打开时把焦点放到面板上（而不是留在触发器上）：
 * 日历的上下左右方向键要靠面板自身处理，焦点不在面板里就收不到。
 */
watch(open, (isOpen) => {
  if (isOpen) void nextTick(() => panelRef.value?.focus())
})

const panelClasses = computed(() => [
  't73-date-picker__panel',
  `t73-date-picker__panel--${view.value}`,
])

defineExpose({
  focus: () => anchorRef.value?.focus(),
  blur: () => anchorRef.value?.blur(),
  open: () => showPanel(),
  close: () => hidePanel('api'),
})
</script>

<template>
  <div
    ref="anchorRef"
    v-bind="attrs"
    class="t73-date-picker t73"
    :class="{
      't73-date-picker--sm': size === 'sm',
      't73-date-picker--open': open,
      't73-date-picker--disabled': isDisabled,
      't73-date-picker--invalid': isInvalid,
      't73-date-picker--range': isRange,
    }"
    role="combobox"
    aria-haspopup="dialog"
    :aria-expanded="open ? 'true' : 'false'"
    :aria-controls="panelId"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-label="ariaLabel"
    :tabindex="isDisabled ? -1 : 0"
    @click="onTriggerClick"
    @keydown="onKeydown"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <span v-if="hasValue" class="t73-date-picker__value">{{ displayText }}</span>
    <span v-else class="t73-date-picker__placeholder">
      {{ isRange ? `${startPlaceholder} / ${endPlaceholder}` : placeholder }}
    </span>

    <button
      v-if="clearable && hasValue && !isDisabled"
      type="button"
      class="t73-date-picker__clear"
      aria-label="清除"
      @click.stop="clear"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.4" />
      </svg>
    </button>

    <span class="t73-date-picker__icon" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <rect
          x="2.5"
          y="3.5"
          width="11"
          height="10"
          rx="2"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        />
        <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" fill="none" stroke="currentColor" stroke-width="1.4" />
      </svg>
    </span>
  </div>

  <Teleport to="body">
    <Transition name="t73-date-picker">
      <div
        v-if="open"
        :id="panelId"
        ref="panelRef"
        :class="panelClasses"
        :style="panelStyle"
        role="dialog"
        tabindex="-1"
        :aria-label="ariaLabel ?? '选择日期'"
      >
        <header class="t73-date-picker__header">
          <button
            type="button"
            class="t73-date-picker__nav"
            :aria-label="view === 'day' ? '上个月' : view === 'month' ? '上一年' : '上一个十年'"
            @click="step(-1)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M10 4l-4 4 4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            class="t73-date-picker__label"
            :disabled="view === 'year'"
            :aria-label="view === 'day' ? '选择月份' : '选择年份'"
            @click="zoomOut"
          >
            {{ headerLabel }}
          </button>

          <button
            type="button"
            class="t73-date-picker__nav"
            :aria-label="view === 'day' ? '下个月' : view === 'month' ? '下一年' : '下一个十年'"
            @click="step(1)"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M6 4l4 4-4 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </header>

        <!-- 日视图 -->
        <div v-if="view === 'day'" class="t73-date-picker__body">
          <div class="t73-date-picker__weekdays" aria-hidden="true">
            <span v-for="weekday in WEEKDAYS" :key="weekday">{{ weekday }}</span>
          </div>
          <div
            class="t73-date-picker__grid"
            role="grid"
            @pointerleave="hoverDate = null"
          >
            <button
              v-for="day in days"
              :key="day.getTime()"
              type="button"
              class="t73-date-picker__day"
              :class="dayClasses(day)"
              :disabled="isDayDisabled(day)"
              :aria-selected="isDaySelected(day) ? 'true' : 'false'"
              @click="pickDay(day)"
              @pointerenter="hoverDate = day"
            >
              {{ day.getDate() }}
            </button>
          </div>
        </div>

        <!-- 月视图 -->
        <div v-else-if="view === 'month'" class="t73-date-picker__body">
          <div class="t73-date-picker__chips">
            <button
              v-for="month in monthGrid"
              :key="month.value"
              type="button"
              class="t73-date-picker__chip"
              :class="{
                't73-date-picker__chip--active':
                  month.value === panelMonth.getMonth(),
              }"
              @click="pickMonth(month.index)"
            >
              {{ month.label }}
            </button>
          </div>
        </div>

        <!-- 年视图 -->
        <div v-else class="t73-date-picker__body">
          <div class="t73-date-picker__chips">
            <button
              v-for="year in years"
              :key="year"
              type="button"
              class="t73-date-picker__chip"
              :class="{ 't73-date-picker__chip--active': year === panelMonth.getFullYear() }"
              @click="pickYear(year)"
            >
              {{ year }}
            </button>
          </div>
        </div>

        <!-- 时间（仅 datetime） -->
        <div v-if="type === 'datetime' && view === 'day'" class="t73-date-picker__time">
          <span class="t73-date-picker__time-label">时间</span>
          <input
            class="t73-date-picker__time-input"
            type="number"
            min="0"
            max="23"
            aria-label="时"
            :value="draftTime.hour"
            @change="clampTime('hour', ($event.target as HTMLInputElement).value)"
          />
          <span aria-hidden="true">:</span>
          <input
            class="t73-date-picker__time-input"
            type="number"
            min="0"
            max="59"
            aria-label="分"
            :value="draftTime.minute"
            @change="clampTime('minute', ($event.target as HTMLInputElement).value)"
          />
          <span aria-hidden="true">:</span>
          <input
            class="t73-date-picker__time-input"
            type="number"
            min="0"
            max="59"
            aria-label="秒"
            :value="draftTime.second"
            @change="clampTime('second', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <footer class="t73-date-picker__footer">
          <button type="button" class="t73-date-picker__action" @click="pickToday">今天</button>
          <button
            type="button"
            class="t73-date-picker__action"
            :disabled="!hasValue"
            @click="clear"
          >
            清除
          </button>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* --- 触发器：与 TSelect 同一档（源页面里两者也是同一套改写） --- */
.t73-date-picker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: var(--73-control-height);
  padding: 0 12px;
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  box-shadow: 0 0 0 1px var(--73-border) inset;
  color: var(--73-ink);
  font-family: var(--73-font-family);
  cursor: pointer;
  transition: box-shadow var(--73-transition);
}

.t73-date-picker--sm {
  min-height: var(--73-control-height-sm);
  padding: 0 8px;
}

.t73-date-picker:hover:not(.t73-date-picker--disabled) {
  box-shadow: 0 0 0 1px var(--73-border-hover) inset;
}

.t73-date-picker--open,
.t73-date-picker:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--73-accent) inset;
}

.t73-date-picker:focus-visible {
  box-shadow:
    0 0 0 1px var(--73-accent) inset,
    var(--73-focus-ring);
}

.t73-date-picker--invalid {
  box-shadow: 0 0 0 1px var(--73-danger) inset;
}

.t73-date-picker--disabled {
  background: var(--73-inset);
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

.t73-date-picker__value,
.t73-date-picker__placeholder {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--73-font-size-body);
  font-variant-numeric: tabular-nums;
}

.t73-date-picker__placeholder {
  color: var(--73-ink-placeholder);
}

.t73-date-picker--disabled .t73-date-picker__placeholder {
  color: var(--73-ink-disabled);
}

.t73-date-picker__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-pill);
  background: color-mix(in srgb, var(--73-ink-muted) 16%, transparent);
  color: var(--73-ink-inverse);
  cursor: pointer;
}

.t73-date-picker__clear:hover {
  background: var(--73-ink-muted);
}

.t73-date-picker__clear svg {
  width: 10px;
  height: 10px;
}

.t73-date-picker__icon {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: var(--73-ink-muted);
}

.t73-date-picker__icon svg {
  width: 16px;
  height: 16px;
}

/* --- 面板：与下拉菜单同一套浮层外观 --- */
.t73-date-picker__panel {
  z-index: var(--73-z-dropdown);
  width: 272px;
  padding: 10px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-panel);
  background: var(--73-surface-strong);
  box-shadow: var(--73-shadow-panel);
  font-family: var(--73-font-family);
  color: var(--73-ink);
  outline: none;
}

.t73-date-picker__panel--year {
  /* 年视图只有 12 个短格子，用不着那么宽 */
  width: 240px;
}

.t73-date-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.t73-date-picker__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-sm);
  background: transparent;
  color: var(--73-ink-muted);
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

.t73-date-picker__nav:hover {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

.t73-date-picker__nav:focus-visible,
.t73-date-picker__label:focus-visible,
.t73-date-picker__action:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-date-picker__nav svg {
  width: 15px;
  height: 15px;
}

.t73-date-picker__label {
  padding: 4px 8px;
  border: none;
  border-radius: var(--73-radius-sm);
  background: transparent;
  color: var(--73-ink);
  font-family: inherit;
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background-color var(--73-transition);
}

.t73-date-picker__label:hover:not(:disabled) {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

.t73-date-picker__label:disabled {
  cursor: default;
}

.t73-date-picker__weekdays,
.t73-date-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.t73-date-picker__weekdays {
  margin-bottom: 4px;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-xs);
  text-align: center;
}

.t73-date-picker__day {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--73-radius-sm);
  background: transparent;
  color: var(--73-ink);
  font-family: inherit;
  font-size: var(--73-font-size-sm);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

/* 相邻月的日子照常可点（免得为了选月初还要先翻月），但压暗一档 */
.t73-date-picker__day--outside {
  color: var(--73-ink-placeholder);
}

.t73-date-picker__day:hover:not(:disabled) {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

.t73-date-picker__day:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

/* 今天：描边而不是填色。填色会与「已选中」混掉——两件事必须一眼分得开。 */
.t73-date-picker__day--today {
  border-color: var(--73-accent-line);
  font-weight: var(--73-font-weight-bold);
}

.t73-date-picker__day--selected,
.t73-date-picker__day--edge {
  background: var(--73-accent);
  border-color: var(--73-accent);
  color: var(--73-accent-contrast);
  font-weight: var(--73-font-weight-bold);
}

.t73-date-picker__day--in-range {
  background: var(--73-accent-soft);
  border-radius: 0;
}

.t73-date-picker__day--disabled {
  color: var(--73-ink-disabled);
  background: transparent;
  border-color: transparent;
  cursor: not-allowed;
  text-decoration: line-through;
}

/* --- 月 / 年视图 --- */
.t73-date-picker__chips {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.t73-date-picker__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--73-radius-sm);
  background: transparent;
  color: var(--73-ink);
  font-family: inherit;
  font-size: var(--73-font-size-sm);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

.t73-date-picker__chip:hover {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

.t73-date-picker__chip:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-date-picker__chip--active {
  border-color: var(--73-accent);
  color: var(--73-accent);
  font-weight: var(--73-font-weight-bold);
}

/* --- 时间 --- */
.t73-date-picker__time {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--73-border-soft);
}

.t73-date-picker__time-label {
  margin-right: 4px;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
}

.t73-date-picker__time-input {
  width: 48px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-sm);
  background: var(--73-surface-strong);
  color: var(--73-ink);
  font-family: inherit;
  font-size: var(--73-font-size-sm);
  font-variant-numeric: tabular-nums;
  text-align: center;
  outline: none;
}

.t73-date-picker__time-input:focus {
  border-color: var(--73-accent);
  box-shadow: var(--73-focus-ring);
}

/* --- 底部动作 --- */
.t73-date-picker__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--73-border-soft);
}

.t73-date-picker__action {
  padding: 4px 8px;
  border: none;
  border-radius: var(--73-radius-sm);
  background: transparent;
  color: var(--73-accent);
  font-family: inherit;
  font-size: var(--73-font-size-sm);
  font-weight: var(--73-font-weight-bold);
  cursor: pointer;
  transition: background-color var(--73-transition);
}

.t73-date-picker__action:hover:not(:disabled) {
  background: var(--73-accent-soft);
}

.t73-date-picker__action:disabled {
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

.t73-date-picker-enter-active,
.t73-date-picker-leave-active {
  transition: opacity var(--73-transition);
}

.t73-date-picker-enter-from,
.t73-date-picker-leave-to {
  opacity: 0;
}
</style>
