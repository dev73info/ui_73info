<script setup lang="ts">
/**
 * TDropdown + TDropdownMenu + TDropdownItem
 *
 * 接替 `<el-dropdown>` / `<el-dropdown-menu>` / `<el-dropdown-item>`
 * （user-client 里 6 / 6 / 21 处）。规格来自仓库里三处菜单改写：
 *
 * ```css
 * /* .dev-resource-action-menu.el-popper —— 面板本体的口径 *\/
 * border: 1px solid var(--dev-line); border-radius: 12px;
 * box-shadow: 0 18px 36px rgba(71, 85, 105, 0.16);
 * /* .el-dropdown-menu —— 菜单内边距与最小宽度 *\/
 * min-width: 112px; padding: 6px;
 * /* .el-dropdown-menu__item —— 菜单项 *\/
 * min-height: 34px; padding: 0 10px; border-radius: 8px;
 * color: var(--dev-ink); font-weight: 700;
 * :hover { background: rgba(31,74,209,.08); color: var(--dev-blue); }
 * .is-disabled { color: rgba(100,116,139,.5); }
 * .is-danger:hover { background: rgba(254,242,242,.96); color: var(--dev-danger-text); }
 * ```
 *
 * 菜单项高度取控件档 36px（源文件是 34px 与 36px 两处），理由见 `tokens.css`。
 *
 * ## 键盘
 *
 * 焦点**留在触发元素上**，移动的只是高亮项——这是 `role="menu"` 的正规做法
 * （用 `aria-activedescendant` 表达高亮）。若把焦点移进菜单，菜单一收起焦点就丢了，
 * 键盘用户要从页头重新 Tab。
 *
 * ## 与 Element 的差异
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | 触发元素 | 自带 `.el-dropdown-link` 包装与箭头 | 直接用默认插槽，样式交给调用方（源页面本来就在自己改） |
 * | `@command` | 只对 `command` 有值的项触发 | 没有 `command` 的项不触发（`undefined` 无法区分「没写」与「就是 undefined」） |
 * | 分组 | `el-dropdown-menu` 里插分隔项 | `TDropdownItem` 的 `divided` 属性 |
 */
import { computed, nextTick, provide } from 'vue'
import { handleListboxKeydown, provideListbox, useOverlay } from '../../primitives'
import type { SelectValue } from '../TSelect/types'
import { DROPDOWN_CONTEXT, type DropdownContext } from './context'
import type { TDropdownEmits, TDropdownProps } from './types'

defineOptions({ name: 'TDropdown' })

const props = withDefaults(defineProps<TDropdownProps>(), {
  trigger: 'click',
  placement: 'bottom-start',
  disabled: false,
  hideOnClick: true,
  minWidth: undefined,
  showDelay: 120,
  hideDelay: 120,
  ariaLabel: undefined,
})

const emit = defineEmits<TDropdownEmits>()

const listbox = provideListbox({ loop: true })
const { activeId } = listbox

/**
 * `hover` 交给 useOverlay 的悬停逻辑；`click` / `manual` 都用 `manual`
 * ——`click` 的切换要顺带处理键盘与禁用态，写在下面更清楚。
 */
const overlayTrigger = computed(() => (props.trigger === 'hover' ? 'hover' : 'manual'))

const {
  open,
  anchorRef,
  panelRef,
  panelStyle,
  show: showMenu,
  hide: hideMenu,
} = useOverlay({
  trigger: overlayTrigger,
  placement: computed(() => props.placement),
  showDelay: computed(() => props.showDelay),
  hideDelay: computed(() => props.hideDelay),
  closeOnEscape: computed(() => !props.disabled),
  onAfterOpen: () => {
    emit('open')
    emit('visible-change', true)
    // 项是打开后才挂上的，等一帧再登记高亮
    void nextTick(() => listbox.resetActive())
  },
  onAfterClose: () => {
    emit('close')
    emit('visible-change', false)
    listbox.setActive(null)
  },
})

const panelWidth = computed(() => {
  if (props.minWidth === undefined) return undefined
  return typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth
})

function show(): void {
  if (props.disabled) return
  showMenu()
}

function close(): void {
  hideMenu('api')
}

function toggle(): void {
  if (props.disabled) return
  if (open.value) close()
  else show()
}

function runCommand(command: SelectValue | undefined): void {
  emit('command', command)
  if (props.hideOnClick) close()
}

provide<DropdownContext>(DROPDOWN_CONTEXT, {
  open,
  close,
  runCommand,
})

function onTriggerClick(event: MouseEvent): void {
  if (props.trigger !== 'click') return
  if (event.defaultPrevented) return
  toggle()
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return

  if (!open.value) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      // 触发元素常常是链接或按钮，Enter/空格有自己的默认行为，这里要拦下来
      event.preventDefault()
      show()
    }
    return
  }

  handleListboxKeydown(event, listbox)
}

/** 触发元素需要键盘可达，但它可能是任意标签（`a` / `button` / `div`） */
const triggerTabindex = computed(() => {
  const el = anchorRef.value
  if (!el) return undefined
  // 原生可聚焦的标签不必再加 tabindex，加了反而会插进 Tab 序列两次
  return /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) ? undefined : 0
})

defineExpose({
  open: show,
  close,
  toggle,
})
</script>

<template>
  <span
    ref="anchorRef"
    class="t73-dropdown t73"
    :class="{ 't73-dropdown--open': open, 't73-dropdown--disabled': disabled }"
    :tabindex="triggerTabindex"
    :aria-haspopup="'menu'"
    :aria-expanded="open ? 'true' : 'false'"
    :aria-label="ariaLabel"
    @click="onTriggerClick"
    @keydown="onKeydown"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="t73-dropdown">
      <div
        v-if="open"
        ref="panelRef"
        class="t73-dropdown__panel t73"
        :style="[panelStyle, panelWidth ? { minWidth: panelWidth } : undefined]"
      >
        <slot name="dropdown" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.t73-dropdown {
  display: inline-flex;
  align-items: center;
  outline: none;
}

.t73-dropdown--disabled {
  cursor: not-allowed;
}

.t73-dropdown:focus-visible {
  border-radius: var(--73-radius-control);
  box-shadow: var(--73-focus-ring);
}

/* 面板：`.dev-resource-action-menu.el-popper` + `.el-dropdown-menu` 的内边距 */
.t73-dropdown__panel {
  z-index: var(--73-z-dropdown);
  min-width: var(--73-panel-min-width);
  padding: var(--73-panel-padding);
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-panel);
  background: var(--73-surface-strong);
  box-shadow: var(--73-shadow-panel);
  font-family: var(--73-font-family);
}

.t73-dropdown-enter-active,
.t73-dropdown-leave-active {
  transition:
    opacity var(--73-transition),
    transform var(--73-transition);
}

.t73-dropdown-enter-from,
.t73-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
