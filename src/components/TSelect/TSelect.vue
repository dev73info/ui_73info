<script setup lang="ts">
/**
 * TSelect
 *
 * 接替 `<el-select>`（user-client 里 58 处）+ `<el-option>`（84 处），
 * 也是 `<el-select-v2>` 的落点（虚拟化不做，见文末「与 Element 的差异」）。
 *
 * ## 规格来源
 *
 * 触发器的尺寸来自 `.dev-toolbar .el-select__wrapper` 与
 * `.dev-page--publish .el-select__wrapper`（`dev-base.css` / `dev-resource.css`）：
 *
 * ```css
 * min-height: var(--dev-control-height); height: var(--dev-control-height);
 * padding: 0 12px; border-radius: var(--dev-radius-control);
 * background: var(--dev-surface-strong); box-shadow: 0 0 0 1px var(--dev-line) inset;
 * ```
 *
 * 悬浮换主色描边、聚焦换主色描边，与同一处的 `.is-hovering` / `.is-focused` 一致。
 * 面板的圆角 12px、`0 18px 36px` 投影、菜单项 8px 圆角来自
 * `.dev-resource-action-menu.el-popper` 与 `.el-dropdown-menu`。
 *
 * ## 与 Element 的差异
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | 清空后的值 | `undefined` / `''` 随版本变 | 单选发 **`null`**，多选发 `[]` |
 * | `v-model` 传入 `''` | 当作有效值（触发器空白 + 多一个清除叉号） | 与 `null` 同等，视为未选择 |
 * | 面板 | 默认挂载、靠 `v-show` 藏 | 同（**刻意**：关闭时仍要能查到已选项的文本） |
 * | 打开时的高亮 | 不高亮 | 已有选中项就高亮它，否则不高亮 |
 * | 虚拟化 | `el-select-v2` | **未实现**；上千条选项时按普通列表渲染 |
 *
 * ## 表单对接
 *
 * 放在 `TFormItem` 里时自动获得失焦即校验、`id` 与 `label` 配对、错误态描边、整表禁用
 * ——与 `TInput` 同一套约定（注入 `FORM_ITEM_CONTEXT`）。
 */
import { computed, inject, nextTick, provide, ref, useAttrs, useId, watch } from 'vue'
import { handleListboxKeydown, provideListbox, useOverlay } from '../../primitives'
import type { ComponentSize } from '../../types/common'
import { FORM_ITEM_CONTEXT } from '../TForm/context'
import { TEmpty } from '../TEmpty'
import { isSameValue, SELECT_CONTEXT, type SelectContext, type SelectOptionEntry } from './context'
import TOption from './TOption.vue'
import type { SelectModelValue, SelectValue, TSelectEmits, TSelectProps } from './types'

defineOptions({ name: 'TSelect', inheritAttrs: false })

const props = withDefaults(defineProps<TSelectProps>(), {
  modelValue: undefined,
  options: () => [],
  multiple: false,
  clearable: false,
  filterable: false,
  disabled: false,
  loading: false,
  placeholder: '请选择',
  size: undefined,
  maxTagCount: undefined,
  fitInputWidth: true,
  noMatchText: '无匹配项',
  noDataText: '暂无选项',
  name: undefined,
  id: undefined,
  ariaLabel: undefined,
  placement: 'bottom-start',
})

const emit = defineEmits<TSelectEmits>()
const attrs = useAttrs()

const item = inject(FORM_ITEM_CONTEXT, null)
const fallbackId = useId()
const panelId = useId()

const isDisabled = computed(() => props.disabled || (item?.disabled.value ?? false))
const size = computed<ComponentSize>(() => props.size ?? item?.size.value ?? 'md')
const isInvalid = computed(() => (item ? item.state.value === 'error' : false))

/* ---------- 选中值 ---------- */

/**
 * 「未选择」的判定：`null`、`undefined`，以及**空字符串**。
 *
 * `''` 必须一并算作未选择。Element 迁过来的 `v-model` 惯用 `''` 表示「什么也没选」
 * （例如 `DevResourceListView.vue` 的 `filters.visibility`），只把 `null` / `undefined`
 * 当空会让 `''` 变成一个「已选中的值」——触发器既不渲染占位文字，又凭空多出一个清除叉号。
 * 因此本组件约定：**`''` 不作为选项值使用**（对照文末「与 Element 的差异」）。
 *
 * 注意与 `TForm/validate.ts` 的 `isEmptyValue` 区分：那个还管「纯空白字符串」与空数组，
 * 服务于表单校验的「有没有填」；这里只回答「`v-model` 这一格有没有带值」，别合并。
 */
function isUnselectedValue(value: SelectValue | undefined): value is null | undefined | '' {
  return value === null || value === undefined || value === ''
}

/** 选中值。单选恒为 0 或 1 个元素的数组；多选为全部选中值 */
const selected = computed<SelectValue[]>(() => {
  const value = props.modelValue
  if (props.multiple) {
    return Array.isArray(value) ? value.filter((current) => !isUnselectedValue(current)) : []
  }
  if (Array.isArray(value) || isUnselectedValue(value)) return []
  return [value]
})

/* ---------- 选项登记 ---------- */

/**
 * 已登记的选项。用响应式数组：触发器要读它算显示文本，选项挂载/卸载时必须带动重渲染。
 *
 * 面板是常驻挂载的，所以这张表在挂载后就完整——关闭状态下也能查到值的显示文本。
 */
const registered = ref<SelectOptionEntry[]>([])

function registerOption(entry: SelectOptionEntry): void {
  const index = registered.value.findIndex((current) => current.id === entry.id)
  if (index >= 0) registered.value.splice(index, 1)
  registered.value.push(entry)
}

function unregisterOption(id: string): void {
  const index = registered.value.findIndex((current) => current.id === id)
  if (index >= 0) registered.value.splice(index, 1)
}

function entryOf(value: SelectValue | undefined): SelectOptionEntry | undefined {
  if (value === undefined) return undefined
  return registered.value.find((current) => isSameValue(current.value, value))
}

/** 值的显示文本。查不到时退回值本身——显示空字符串会让问题更难排查 */
function labelOf(value: SelectValue | undefined): string {
  if (value === undefined) return ''
  return entryOf(value)?.label() ?? String(value)
}

/* ---------- 过滤 ---------- */

const query = ref('')

function matches(label: string): boolean {
  if (!props.filterable) return true
  const needle = query.value.trim().toLowerCase()
  if (!needle) return true
  return label.toLowerCase().includes(needle)
}

/** 当前可见且可用的选项（登记顺序即 DOM 顺序） */
function visibleEntries(): SelectOptionEntry[] {
  return registered.value.filter((entry) => matches(entry.label()) && !entry.disabled())
}

/* ---------- 列表导航与浮层 ---------- */

const listbox = provideListbox({ loop: true })
const { activeId } = listbox

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
  matchWidth: computed(() => props.fitInputWidth),
  onAfterOpen: handleOpened,
  onAfterClose: handleClosed,
})

const inputRef = ref<HTMLInputElement | null>(null)

// 函数声明会被提升，所以可以写在 useOverlay 之后、又被上面的选项对象引用
function handleOpened(): void {
  emit('visible-change', true)
  void nextTick(() => {
    // 打开时把高亮落到已选项上：「回车确认原值」是最常见的动作，落在别处会误改
    const active = entryOf(selected.value[0])
    if (active && !active.disabled()) listbox.setActive(active.id)
    if (props.filterable) inputRef.value?.focus()
  })
}

function handleClosed(): void {
  emit('visible-change', false)
  query.value = ''
  if (props.filterable) inputRef.value?.blur()
}

/* ---------- 选择 ---------- */

function commit(next: SelectValue[]): void {
  const payload: SelectModelValue = props.multiple ? next : (next[0] ?? null)
  emit('update:modelValue', payload)
  emit('change', payload)
  item?.notify('change')
}

const context: SelectContext = {
  multiple: computed(() => props.multiple),
  disabled: isDisabled,
  size,
  open,
  query,
  selected,
  matches,
  isSelected: (value) => selected.value.some((current) => isSameValue(current, value)),
  choose(value) {
    if (props.multiple) {
      const next = selected.value.filter((current) => !isSameValue(current, value))
      // 已经在选中集合里 → 这次是取消选中；不在 → 追加
      if (next.length === selected.value.length) next.push(value)
      commit(next)
      // 多选不收起面板，但要把过滤词清掉，好接着选下一个
      query.value = ''
      void nextTick(() => inputRef.value?.focus())
      return
    }
    commit([value])
    hidePanel('select')
  },
  registerOption,
  unregisterOption,
  onFilterChanged: () => {
    void nextTick(() => {
      if (!open.value) return
      listbox.setActive(visibleEntries()[0]?.id ?? null)
    })
  },
}

provide(SELECT_CONTEXT, context)

watch(query, () => context.onFilterChanged())

function removeTag(value: SelectValue): void {
  emit('remove-tag', value)
  commit(selected.value.filter((current) => !isSameValue(current, value)))
}

function clear(): void {
  if (isDisabled.value) return
  commit([])
  query.value = ''
  emit('clear')
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
    if (
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault()
      showPanel()
    }
    return
  }

  // 可输入过滤时，字母键与 Home/End 属于输入框，不能让列表导航抢走
  handleListboxKeydown(event, listbox, {
    typeahead: !props.filterable,
    homeEnd: !props.filterable,
  })
}

function onFilterInput(event: Event): void {
  query.value = (event.target as HTMLInputElement).value
}

function onFocusIn(event: FocusEvent): void {
  emit('focus', event)
}

function onFocusOut(event: FocusEvent): void {
  emit('blur', event)
  item?.notify('blur')
}

/* ---------- 显示 ---------- */

/** 面板打开时输入框显示过滤词；关闭时显示已选项文本 */
const inputValue = computed(() => (open.value ? query.value : labelOf(selected.value[0])))

const showPlaceholder = computed(() => !props.filterable && selected.value.length === 0)

const isEmpty = computed(() => registered.value.length === 0)
const hasNoMatch = computed(
  () => props.filterable && query.value.trim().length > 0 && visibleEntries().length === 0,
)

const visibleTags = computed(() =>
  props.maxTagCount === undefined
    ? selected.value
    : selected.value.slice(0, props.maxTagCount),
)

const hiddenTagCount = computed(() => selected.value.length - visibleTags.value.length)

defineExpose({
  focus(): void {
    if (inputRef.value) inputRef.value.focus()
    else anchorRef.value?.focus()
  },
  blur(): void {
    if (inputRef.value) inputRef.value.blur()
    else anchorRef.value?.blur()
  },
  open: () => showPanel(),
  close: () => hidePanel('api'),
})
</script>

<template>
  <div
    ref="anchorRef"
    v-bind="attrs"
    class="t73-select t73"
    :class="{
      't73-select--sm': size === 'sm',
      't73-select--open': open,
      't73-select--disabled': isDisabled,
      't73-select--invalid': isInvalid,
      't73-select--multiple': multiple,
    }"
    role="combobox"
    aria-haspopup="listbox"
    :aria-expanded="open ? 'true' : 'false'"
    :aria-controls="panelId"
    :aria-activedescendant="open && activeId ? activeId : undefined"
    :aria-disabled="isDisabled ? 'true' : undefined"
    :aria-label="ariaLabel"
    :tabindex="isDisabled ? -1 : 0"
    @click="onTriggerClick"
    @keydown="onKeydown"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <span v-if="multiple && selected.length > 0" class="t73-select__tags">
      <span v-for="value in visibleTags" :key="String(value)" class="t73-select__tag">
        <span class="t73-select__tag-label">{{ labelOf(value) }}</span>
        <button
          v-if="!isDisabled"
          type="button"
          class="t73-select__tag-close"
          :aria-label="`移除 ${labelOf(value)}`"
          @click.stop="removeTag(value)"
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
      </span>
      <span v-if="hiddenTagCount > 0" class="t73-select__tag t73-select__tag--more">
        +{{ hiddenTagCount }}
      </span>
    </span>

    <input
      v-if="filterable"
      ref="inputRef"
      class="t73-select__input"
      type="text"
      autocomplete="off"
      :id="id ?? item?.inputId ?? fallbackId"
      :name="name"
      :value="inputValue"
      :placeholder="placeholder"
      :disabled="isDisabled"
      :aria-autocomplete="'list'"
      :aria-invalid="isInvalid ? 'true' : undefined"
      :aria-describedby="isInvalid ? item?.errorId : undefined"
      @input="onFilterInput"
    />
    <span v-else-if="showPlaceholder" class="t73-select__placeholder">{{ placeholder }}</span>
    <span v-else-if="!multiple" class="t73-select__value">{{ labelOf(selected[0]) }}</span>

    <button
      v-if="clearable && !isDisabled && selected.length > 0"
      type="button"
      class="t73-select__clear"
      aria-label="清除"
      @click.stop="clear"
    >
      <svg viewBox="0 0 12 12" aria-hidden="true">
        <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" stroke-width="1.4" />
      </svg>
    </button>

    <span class="t73-select__arrow" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path
          d="M4 6.5l4 4 4-4"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </div>

  <Teleport to="body">
    <!-- 面板**常驻**挂载：关闭状态也要能查到已选项的文本，见 context.ts 顶部 -->
    <div
      :id="panelId"
      ref="panelRef"
      class="t73-select-panel t73"
      :class="{ 't73-select-panel--open': open }"
      :style="panelStyle"
      role="listbox"
      :aria-multiselectable="multiple ? 'true' : undefined"
    >
      <div v-if="loading" class="t73-select-panel__hint">加载中…</div>
      <TEmpty v-else-if="isEmpty" :description="noDataText" size="sm" variant="plain" />
      <TEmpty v-else-if="hasNoMatch" :description="noMatchText" size="sm" variant="plain" />
      <ul class="t73-select-panel__list">
        <TOption
          v-for="option in options"
          :key="String(option.value)"
          :value="option.value"
          :label="option.label"
          :disabled="option.disabled"
        />
        <slot />
      </ul>
    </div>
  </Teleport>
</template>

<style scoped>
/* --- 触发器：`.dev-toolbar .el-select__wrapper` --- */
.t73-select {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: var(--73-control-height);
  padding: 0 12px;
  border-radius: var(--73-radius-control);
  background: var(--73-surface-strong);
  /* 描边用 inset 阴影而不是 border：与源文件一致，悬浮/聚焦时也不必重排 */
  box-shadow: 0 0 0 1px var(--73-border) inset;
  color: var(--73-ink);
  font-family: var(--73-font-family);
  cursor: pointer;
  transition: box-shadow var(--73-transition);
}

.t73-select--sm {
  min-height: var(--73-control-height-sm);
  padding: 0 8px;
}

.t73-select:hover:not(.t73-select--disabled) {
  box-shadow: 0 0 0 1px var(--73-border-hover) inset;
}

.t73-select--open,
.t73-select:focus-visible {
  outline: none;
  box-shadow: 0 0 0 1px var(--73-accent) inset;
}

.t73-select:focus-visible {
  box-shadow:
    0 0 0 1px var(--73-accent) inset,
    var(--73-focus-ring);
}

.t73-select--invalid {
  box-shadow: 0 0 0 1px var(--73-danger) inset;
}

.t73-select--disabled {
  background: var(--73-inset);
  color: var(--73-ink-disabled);
  cursor: not-allowed;
}

/* 多选时触发器会换行：内边距收一点，让芯片不被挤扁 */
.t73-select--multiple {
  flex-wrap: wrap;
  padding: 5px 12px;
  row-gap: 4px;
}

.t73-select__placeholder {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--73-ink-placeholder);
}

.t73-select--disabled .t73-select__placeholder {
  color: var(--73-ink-disabled);
}

.t73-select__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--73-font-size-body);
}

.t73-select__input {
  flex: 1 1 auto;
  min-width: 40px;
  height: 100%;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  font-size: var(--73-font-size-body);
  outline: none;
  cursor: inherit;
}

.t73-select__input::placeholder {
  color: var(--73-ink-placeholder);
}

/* --- 多选芯片：与 `TTag` 的胶囊同口径 --- */
.t73-select__tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  flex: 1 1 auto;
  min-width: 0;
}

.t73-select__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-height: 22px;
  padding: 0 6px 0 8px;
  border-radius: var(--73-radius-pill);
  background: var(--73-accent-soft);
  color: var(--73-accent);
  font-size: var(--73-font-size-xs);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.4;
}

.t73-select__tag-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.t73-select__tag--more {
  padding: 0 8px;
  background: var(--73-neutral-soft);
  color: var(--73-neutral-text);
}

.t73-select__tag-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-pill);
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.72;
}

.t73-select__tag-close:hover {
  opacity: 1;
}

.t73-select__tag-close svg {
  width: 9px;
  height: 9px;
}

/* --- 清除与箭头 --- */
.t73-select__clear {
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
  transition: background-color var(--73-transition);
}

.t73-select__clear:hover {
  background: var(--73-ink-muted);
}

.t73-select__clear svg {
  width: 10px;
  height: 10px;
}

.t73-select__arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: var(--73-ink-muted);
  transition: transform var(--73-transition);
}

.t73-select--open .t73-select__arrow {
  transform: rotate(180deg);
}

.t73-select__arrow svg {
  width: 16px;
  height: 16px;
}

/* --- 面板：`.dev-resource-action-menu.el-popper` + `.el-dropdown-menu` ---
   `position / top / left` 由 useFloating 通过内联 style 给，这里只定外观。
   收起用 `display: none`（不卸载），选项因此一直可查。 */
.t73-select-panel {
  display: none;
  z-index: var(--73-z-dropdown);
  padding: var(--73-panel-padding);
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-panel);
  background: var(--73-surface-strong);
  box-shadow: var(--73-shadow-panel);
  font-family: var(--73-font-family);
}

.t73-select-panel--open {
  display: block;
}

.t73-select-panel__list {
  display: block;
  max-height: 280px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.t73-select-panel__hint {
  padding: 10px 12px;
  color: var(--73-ink-muted);
  font-size: var(--73-font-size-sm);
}
</style>
