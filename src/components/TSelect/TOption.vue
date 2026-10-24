<script setup lang="ts">
/**
 * TOption
 *
 * 下拉里的一项。接替 `<el-option>`（user_client 里 84 处）。
 *
 * ## 它做三件事
 *
 * 1. 把自己的值↔文本登记给选择器，让**关闭状态**下的触发器也能显示中文而不是值本身；
 * 2. 注册进列表导航（`↑↓` / typeahead / Home / End），禁用项自动跳过；
 * 3. 按当前过滤词决定自己是否渲染。
 *
 * ## 为什么注册与渲染是两回事
 *
 * 被过滤掉的项**仍然登记在选择器里**（否则已选项的文本会突然消失），
 * 只是从列表导航里注销、并且不渲染。所以 `v-show` 而不是 `v-if`：
 * `v-if` 会连登记一起丢掉。
 */
import { computed, inject, onMounted, onScopeDispose, ref, useId, watch } from 'vue'
import { useListboxContext, type ListboxItemHandle } from '../../primitives'
import { OPTION_GROUP_CONTEXT, SELECT_CONTEXT, type SelectContext, type SelectOptionEntry } from './context'
import type { TOptionEmits, TOptionProps } from './types'

defineOptions({ name: 'TOption' })

const props = withDefaults(defineProps<TOptionProps>(), {
  label: undefined,
  disabled: false,
})

const emit = defineEmits<TOptionEmits>()

const injectedSelect = inject(SELECT_CONTEXT, null)

if (!injectedSelect) {
  throw new Error(
    '[ui_73info] TOption 必须放在 TSelect 内使用：没有 TSelect 提供的选中状态，选项无法参与选择。',
  )
}

/**
 * 绑到显式类型上。不能直接在各处写 `injectedSelect.xxx`：
 * 它被用在函数声明（`labelText` 之外的 `entry`、`listboxItem`）里，
 * TS 不会把 `if (!injectedSelect) throw` 的收窄带进去。
 */
const select: SelectContext = injectedSelect

const group = inject(OPTION_GROUP_CONTEXT, null)
const listbox = useListboxContext()
const rootRef = ref<HTMLElement | null>(null)
const id = useId()

/** 可见文本：优先 `label` prop，否则取插槽渲染结果——与 `<el-option>` 一致 */
function labelText(): string {
  if (props.label !== undefined) return props.label
  const text = rootRef.value?.textContent?.trim()
  return text && text.length > 0 ? text : String(props.value ?? '')
}

const matches = computed(() => select.matches(labelText()))
const isDisabled = computed(() => props.disabled || (group?.disabled.value ?? false) || select.disabled.value)
const selected = computed(() => select.isSelected(props.value))
const isActive = computed(() => listbox?.activeId.value === id)

/* ---------- 登记给选择器（一直保留，供触发器查文本） ---------- */

const entry: SelectOptionEntry = {
  id,
  value: props.value,
  label: labelText,
  disabled: () => isDisabled.value,
}

onMounted(() => {
  select.registerOption(entry)
})

onScopeDispose(() => {
  select.unregisterOption(id)
  unregisterFromListbox()
})

/* ---------- 登记给列表导航（只在可见且未禁用时） ---------- */

const listboxItem: ListboxItemHandle = {
  id,
  disabled: () => isDisabled.value,
  label: labelText,
  select: () => choose(),
  element: () => rootRef.value,
}

let registered = false

function registerToListbox(): void {
  if (!listbox || registered) return
  listbox.register(listboxItem)
  registered = true
}

function unregisterFromListbox(): void {
  if (!listbox || !registered) return
  listbox.unregister(listboxItem)
  registered = false
}

watch(
  [matches, isDisabled],
  ([visible, disabled]) => {
    if (visible && !disabled) registerToListbox()
    else unregisterFromListbox()
  },
  { immediate: true },
)

function choose(): void {
  if (isDisabled.value) return
  emit('select', props.value)
  select.choose(props.value)
}

function onPointerMove(): void {
  if (isDisabled.value) return
  listbox?.setActive(id)
}

function onMouseDown(event: MouseEvent): void {
  // 阻止默认行为：否则点击时触发器会失焦，面板可能先收到一次 blur 相关处理
  event.preventDefault()
}
</script>

<template>
  <li
    v-show="matches"
    ref="rootRef"
    class="t73-option t73"
    :class="{
      't73-option--selected': selected,
      't73-option--active': isActive,
      't73-option--disabled': isDisabled,
    }"
    role="option"
    :id="id"
    :aria-selected="selected ? 'true' : 'false'"
    :aria-disabled="isDisabled ? 'true' : undefined"
    @mousedown="onMouseDown"
    @click="choose"
    @pointermove="onPointerMove"
  >
    <span class="t73-option__label">
      <slot>{{ label ?? value }}</slot>
    </span>
    <svg v-if="selected" class="t73-option__check" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </li>
</template>

<style scoped>
.t73-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: var(--73-control-height);
  margin: 0;
  padding: 0 10px;
  border-radius: var(--73-radius-menu-item);
  color: var(--73-ink);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.4;
  cursor: pointer;
  list-style: none;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

/* 高亮（键盘或指针）与选中是两回事，视觉上都要看得出来：
   高亮是浅底 + 主色字，选中额外给一个对勾。 */
.t73-option--active {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

.t73-option--selected {
  color: var(--73-accent);
}

.t73-option--disabled {
  color: color-mix(in srgb, var(--73-ink-muted) 50%, transparent);
  cursor: not-allowed;
}

.t73-option--disabled.t73-option--active {
  background: transparent;
  color: color-mix(in srgb, var(--73-ink-muted) 50%, transparent);
}

.t73-option__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.t73-option__check {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  color: var(--73-accent);
}
</style>
