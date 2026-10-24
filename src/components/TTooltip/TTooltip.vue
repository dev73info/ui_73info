<script setup lang="ts">
/**
 * TTooltip
 *
 * 纯文字提示气泡。user_client 里 `<el-tooltip>` 用量为 0（表格的
 * `show-overflow-tooltip` 走的是原生 `title`），所以这个组件主要服务于
 * `ui_73info` 之后的页面，规格由令牌推导：
 *
 * - 面板：12px 圆角、`--73-shadow-panel`、`--73-panel-gap` 的 4px 间距
 *   （与下拉菜单同一套浮层外观，同一页里两种气泡不该长得不一样）；
 * - 深底浅字：`--73-tooltip-bg` / `--73-tooltip-ink`。仓库没有登记过这一档，
 *   按「正文墨色的 92%」从已有基色算，两套主题各自得到符合自身墨色的深底。
 *
 * ## 无障碍
 *
 * 触发元素带上 `aria-describedby` 指向气泡的 id，只在打开时挂——
 * 一直挂着会让读屏在收起状态下也念出提示内容。
 * 气泡本身是 `role="tooltip"`，并且**不接受焦点**（提示内容不该是可交互的，
 * 需要交互就用 `TPopover`）。
 *
 * ## `hover` 之外的两个触发
 *
 * `focus` 是键盘用户的主要路径：只用 `hover` 的话，Tab 到那颗图标按钮上什么也看不到，
 * 所以默认把 `focus` 也算上（Element 的 `trigger` 默认也含 focus）。
 */
import { computed, useAttrs, useId } from 'vue'
import { useOverlay } from '../../primitives'
import type { TTooltipEmits, TTooltipProps, TooltipTrigger } from './types'

defineOptions({ name: 'TTooltip', inheritAttrs: false })

const props = withDefaults(defineProps<TTooltipProps>(), {
  content: undefined,
  placement: 'top',
  trigger: () => ['hover', 'focus'] as TooltipTrigger[],
  disabled: false,
  showDelay: 120,
  hideDelay: 80,
  maxWidth: 260,
  open: undefined,
  ariaLabel: undefined,
})

const emit = defineEmits<TTooltipEmits>()
const attrs = useAttrs()

const tooltipId = useId()

const triggerList = computed<TooltipTrigger[]>(() => {
  const value = props.trigger
  return Array.isArray(value) ? value : [value]
})

const wantsHover = computed(() => triggerList.value.includes('hover'))
const wantsFocus = computed(() => triggerList.value.includes('focus'))
const wantsClick = computed(() => triggerList.value.includes('click'))

/**
 * `useOverlay` 一次只支持一种触发方式。三种都想要时按优先级退化成一种，
 * 并用下面两个 `focusin` / `focusout` 处理补上聚焦那条通道
 * ——只写 `hover` 的话，Tab 到那颗图标按钮上什么也看不到，键盘用户彻底看不到提示。
 */
const overlayTrigger = computed(() => {
  if (wantsHover.value) return 'hover' as const
  if (wantsFocus.value) return 'focus' as const
  if (wantsClick.value) return 'click' as const
  return 'manual' as const
})

const {
  open,
  anchorRef,
  panelRef,
  panelStyle,
  resolvedPlacement,
  show,
  hide,
} = useOverlay({
  trigger: overlayTrigger,
  placement: computed(() => props.placement),
  showDelay: computed(() => props.showDelay),
  hideDelay: computed(() => props.hideDelay),
  closeOnEscape: true,
  // 提示是只读的：点哪里都算点外部，点一下就该收起来
  closeOnOutside: true,
  open: computed(() => (props.open === undefined ? undefined : props.open)),
  onOpenChange: (next) => emit('update:open', next),
  onAfterOpen: () => emit('open'),
  onAfterClose: () => emit('close'),
})

/** 悬停与聚焦同时要时，聚焦作为补充通道 */
function onAnchorFocusIn(): void {
  if (!wantsFocus.value) return
  if (props.disabled) return
  show()
}

function onAnchorFocusOut(): void {
  if (!wantsFocus.value) return
  hide('outside')
}

const isOpen = computed(() => open.value && !props.disabled)

const descriptionId = computed(() => (isOpen.value ? tooltipId : undefined))

const style = computed(() => ({
  ...panelStyle.value,
  maxWidth: typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth,
}))

/** 气泡尖角：贴在哪一侧就画在对面 */
const arrowSide = computed(() => resolvedPlacement.value.split('-')[0] ?? 'top')
</script>

<template>
  <span
    ref="anchorRef"
    v-bind="attrs"
    class="t73-tooltip t73"
    :aria-describedby="descriptionId"
    @focusin="onAnchorFocusIn"
    @focusout="onAnchorFocusOut"
  >
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="t73-tooltip">
      <div
        v-if="isOpen"
        :id="tooltipId"
        ref="panelRef"
        class="t73-tooltip__panel t73"
        :class="`t73-tooltip__panel--${arrowSide}`"
        :style="style"
        role="tooltip"
        :aria-label="ariaLabel"
      >
        <slot name="content">{{ content }}</slot>
        <span class="t73-tooltip__arrow" aria-hidden="true" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 触发元素本身不加任何视觉：提示不该改变触发器的外观 */
.t73-tooltip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.t73-tooltip__panel {
  z-index: var(--73-z-toast);
  padding: 6px 10px;
  border-radius: var(--73-radius-sm);
  background: var(--73-tooltip-bg);
  color: var(--73-tooltip-ink);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-sm);
  line-height: 1.5;
  /* 提示文字不该被选中：它常常挡住下面的内容，选中会妨碍操作 */
  user-select: none;
}

.t73-tooltip__arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  transform: rotate(45deg);
}

/* 尖角贴在面板朝锚点的那一边 */
.t73-tooltip__panel--top .t73-tooltip__arrow {
  bottom: -4px;
  left: calc(50% - 4px);
}

.t73-tooltip__panel--bottom .t73-tooltip__arrow {
  top: -4px;
  left: calc(50% - 4px);
}

.t73-tooltip__panel--left .t73-tooltip__arrow {
  top: calc(50% - 4px);
  right: -4px;
}

.t73-tooltip__panel--right .t73-tooltip__arrow {
  top: calc(50% - 4px);
  left: -4px;
}

.t73-tooltip-enter-active,
.t73-tooltip-leave-active {
  transition: opacity var(--73-transition);
}

.t73-tooltip-enter-from,
.t73-tooltip-leave-to {
  opacity: 0;
}
</style>
