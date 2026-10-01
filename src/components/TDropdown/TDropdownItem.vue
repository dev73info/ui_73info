<script setup lang="ts">
/**
 * TDropdownItem
 *
 * 一条菜单项。规格来自 `.dev-resource-action-menu .el-dropdown-menu__item`
 * 与 `.requirement-action-menu .el-dropdown-menu__item`：
 *
 * ```css
 * min-height: 34px; padding: 0 10px; border-radius: 8px;
 * font-weight: 700;
 * :hover { background: <主色 8%>; color: <主色>; }
 * .is-disabled { color: rgba(100,116,139,.5); }
 * .is-danger:hover { background: <红 6%>; color: <红>; }
 * ```
 *
 * ## 两个细节
 *
 * - **`tabindex="-1"` 而不是 `0`**：焦点留在触发元素上（见 `TDropdown.vue` 顶部），
 *   菜单项只接收高亮。给它们 `tabindex="0"` 会让 Tab 在菜单里走一圈，
 *   而不是按 Esc 收起后继续走页面。
 * - **`divided` 而不是插一个 `<li class="divider">`**：分隔线是菜单项的边框，
 *   不是独立元素。这样 `↑↓` 不会把高亮停在一个纯装饰的 `<li>` 上。
 */
import { computed, inject, onScopeDispose, ref, useId, watch } from 'vue'
import { useListboxContext, type ListboxItemHandle } from '../../primitives'
import { DROPDOWN_CONTEXT, type DropdownContext } from './context'
import type { TDropdownItemEmits, TDropdownItemProps } from './types'

defineOptions({ name: 'TDropdownItem' })

const props = withDefaults(defineProps<TDropdownItemProps>(), {
  command: undefined,
  disabled: false,
  divided: false,
  tone: 'default',
  active: false,
  iconOnly: false,
  ariaLabel: undefined,
})

const emit = defineEmits<TDropdownItemEmits>()

const injectedDropdown = inject(DROPDOWN_CONTEXT, null)

if (!injectedDropdown) {
  throw new Error(
    '[ui_73info] TDropdownItem 必须放在 TDropdown 内使用：没有 TDropdown 提供的收起与回抛逻辑，点了不会有任何反应。',
  )
}

/**
 * 绑到显式类型上。不能直接在各处写 `injectedDropdown.xxx`：
 * 它被用在下面那些函数声明里，TS 不会把 `if (!…) throw` 的收窄带进函数体。
 */
const dropdown: DropdownContext = injectedDropdown

const listbox = useListboxContext()
const rootRef = ref<HTMLElement | null>(null)
const id = useId()

const isHighlighted = computed(() => listbox?.activeId.value === id)
const isActive = computed(() => props.active)

function labelText(): string {
  const text = rootRef.value?.textContent?.trim()
  return text && text.length > 0 ? text : String(props.command ?? '')
}

function select(): void {
  if (props.disabled) return
  emit('click')
  dropdown.runCommand(props.command)
}

const listboxItem: ListboxItemHandle = {
  id,
  disabled: () => props.disabled,
  label: labelText,
  select,
  element: () => rootRef.value,
}

let registered = false

function register(): void {
  if (!listbox || registered) return
  listbox.register(listboxItem)
  registered = true
}

function unregister(): void {
  if (!listbox || !registered) return
  listbox.unregister(listboxItem)
  registered = false
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) unregister()
    else register()
  },
  { immediate: true },
)

onScopeDispose(unregister)

/**
 * 只做高亮，不做键盘——键盘事件挂在触发元素上（见 `TDropdown.vue`）。
 * 指针经过时同步高亮，避免「鼠标在这一项上、键盘高亮还在上一项」。
 */
function onPointerMove(): void {
  if (props.disabled) return
  listbox?.setActive(id)
}
</script>

<template>
  <li
    ref="rootRef"
    class="t73-dropdown-item t73"
    :class="{
      't73-dropdown-item--disabled': disabled,
      't73-dropdown-item--divided': divided,
      't73-dropdown-item--danger': tone === 'danger',
      't73-dropdown-item--active': isActive,
      't73-dropdown-item--highlighted': isHighlighted,
      't73-dropdown-item--icon-only': iconOnly,
    }"
    role="menuitem"
    :id="id"
    tabindex="-1"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-label="ariaLabel"
    @click="select"
    @pointermove="onPointerMove"
  >
    <span v-if="$slots.prefix" class="t73-dropdown-item__affix"><slot name="prefix" /></span>
    <span class="t73-dropdown-item__label"><slot>{{ command }}</slot></span>
    <span v-if="isActive" class="t73-dropdown-item__sr-only">（当前）</span>
    <svg v-if="isActive" class="t73-dropdown-item__check" viewBox="0 0 16 16" aria-hidden="true">
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
.t73-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--73-control-height);
  padding: 0 10px;
  border-radius: var(--73-radius-menu-item);
  color: var(--73-ink);
  font-size: var(--73-font-size-body);
  font-weight: var(--73-font-weight-bold);
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

/* 分隔线取整项的上边框，而不是插一个独立元素：
   这样键盘导航不会把高亮停在一个装饰元素上（见文件顶部）。 */
.t73-dropdown-item--divided {
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px solid var(--73-border-soft);
}

.t73-dropdown-item--highlighted,
.t73-dropdown-item:hover:not(.t73-dropdown-item--disabled) {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

/* 当前值那一项：即使没被高亮也标出主色，与源页面的 `.is-active` 一致 */
.t73-dropdown-item--active {
  color: var(--73-accent);
}

.t73-dropdown-item--danger {
  color: var(--73-danger-text);
}

.t73-dropdown-item--danger.t73-dropdown-item--highlighted,
.t73-dropdown-item--danger:hover:not(.t73-dropdown-item--disabled) {
  background: var(--73-danger-soft);
  color: var(--73-danger-text);
}

.t73-dropdown-item--disabled {
  color: color-mix(in srgb, var(--73-ink-muted) 50%, transparent);
  cursor: not-allowed;
}

.t73-dropdown-item--icon-only {
  justify-content: center;
  padding: 0;
}

.t73-dropdown-item__affix {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
}

.t73-dropdown-item__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t73-dropdown-item--icon-only .t73-dropdown-item__label {
  flex: 0 0 auto;
}

.t73-dropdown-item__check {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
}

/* 视觉上藏起来但读屏能读到：菜单项的「当前」标记不能只靠一个对勾图标表达。
   不用 display: none —— 那会把内容从无障碍树里摘掉。 */
.t73-dropdown-item__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* 触屏档：菜单项撑到 44px（设计规范第六节） */
@media (max-width: 640px) {
  .t73-dropdown-item {
    min-height: 44px;
  }
}
</style>
