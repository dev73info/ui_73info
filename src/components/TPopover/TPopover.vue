<script setup lang="ts">
/**
 * TPopover
 *
 * 可交互的浮层：面板里可以放按钮、链接、表单。与 `TTooltip` 的分工是**能不能交互**——
 * 提示是只读的一段文字，气泡是一块小界面。
 *
 * ## 规格来源
 *
 * 与下拉菜单同一套浮层外观（12px 圆角、1px 描边、`--73-shadow-panel`）：
 * 同一页里两种浮层的描边与投影不该长得不一样。尖角用 8px 的旋转方块画，
 * 底面 `inherit` 面板底色，所以只要面板底色变了尖角自动跟着走。
 *
 * ## 关闭行为
 *
 * - 点外部关闭（面板与锚点都算内部，见 `useOverlay`）；
 * - Esc 关闭；
 * - `trigger="hover"` 时有进出延迟，指针从锚点穿过 8px 空隙进面板不会误关。
 *
 * ## 焦点
 *
 * 默认**不**把焦点挪进面板：气泡里常常只是说明文字与一个链接，
 * 强行挪焦点会让键盘用户在 Tab 序列里「跳一格」。要用键盘进入面板就正常 Tab 过去
 * ——面板被 `Teleport` 到 `body`，所以在 Tab 序列的末尾。这通常是对的
 * （气泡是补充信息，不该插进主流程），但如果面板里有必须按顺序到达的控件，
 * 就把它做成 `TDialog` 或普通展开区，不要用气泡。
 */
import { computed, useAttrs, useId } from 'vue'
import { useOverlay } from '../../primitives'
import type { TPopoverEmits, TPopoverProps } from './types'

defineOptions({ name: 'TPopover', inheritAttrs: false })

const props = withDefaults(defineProps<TPopoverProps>(), {
  placement: 'bottom',
  trigger: 'click',
  title: undefined,
  width: undefined,
  maxWidth: 360,
  gap: 8,
  arrow: true,
  disabled: false,
  open: undefined,
  showDelay: 120,
  hideDelay: 120,
  ariaLabel: undefined,
})

const emit = defineEmits<TPopoverEmits>()
const attrs = useAttrs()

const panelId = useId()

const {
  open,
  anchorRef,
  panelRef,
  panelStyle,
  resolvedPlacement,
} = useOverlay({
  trigger: computed(() => props.trigger),
  placement: computed(() => props.placement),
  gap: computed(() => props.gap),
  showDelay: computed(() => props.showDelay),
  hideDelay: computed(() => props.hideDelay),
  open: computed(() => (props.open === undefined ? undefined : props.open)),
  onOpenChange: (next) => emit('update:open', next),
  onAfterOpen: () => emit('open'),
  onAfterClose: () => emit('close'),
})

const isOpen = computed(() => open.value && !props.disabled)

const style = computed(() => {
  const base = { ...panelStyle.value }
  if (props.width !== undefined) {
    base.width = typeof props.width === 'number' ? `${props.width}px` : props.width
  }
  base.maxWidth =
    typeof props.maxWidth === 'number' ? `${props.maxWidth}px` : props.maxWidth
  return base
})

const arrowSide = computed(() => resolvedPlacement.value.split('-')[0] ?? 'top')
</script>

<template>
  <span ref="anchorRef" v-bind="attrs" class="t73-popover t73">
    <slot />
  </span>

  <Teleport to="body">
    <Transition name="t73-popover">
      <div
        v-if="isOpen"
        :id="panelId"
        ref="panelRef"
        class="t73-popover__panel t73"
        :class="`t73-popover__panel--${arrowSide}`"
        :style="style"
        role="dialog"
        :aria-label="ariaLabel ?? title"
      >
        <header v-if="title || $slots.title" class="t73-popover__header">
          <slot name="title">{{ title }}</slot>
        </header>
        <div class="t73-popover__body">
          <slot name="content" />
        </div>
        <span v-if="arrow" class="t73-popover__arrow" aria-hidden="true" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.t73-popover {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
}

.t73-popover__panel {
  z-index: var(--73-z-dropdown);
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-panel);
  background: var(--73-surface-strong);
  box-shadow: var(--73-shadow-panel);
  color: var(--73-ink);
  font-family: var(--73-font-family);
  font-size: var(--73-font-size-body);
}

.t73-popover__header {
  padding: 12px 14px 0;
  font-size: var(--73-font-size-md);
  font-weight: var(--73-font-weight-bold);
}

.t73-popover__body {
  padding: 12px 14px;
}

.t73-popover__header + .t73-popover__body {
  padding-top: 8px;
}

/* 尖角是一个旋转 45° 的 10px 方块。要让它「指向」某个方向，
   就得留出对应的两条边——10px 方块转 45° 后，留右边+下边指向「下」，
   留下边+左边指向「左」，留上边+左边指向「上」，留上边+右边指向「右」。
   下面四种方位照着这张对应表写，别凭直觉加边。 */
.t73-popover__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  border-right: 1px solid var(--73-border);
  border-bottom: 1px solid var(--73-border);
  background: inherit;
  transform: rotate(45deg);
}

/* 面板在锚点上方 → 尖角朝下（默认那两条边就是） */
.t73-popover__panel--top .t73-popover__arrow {
  bottom: -6px;
  left: calc(50% - 5px);
}

/* 面板在锚点下方 → 尖角朝上：换成左边 + 上边 */
.t73-popover__panel--bottom .t73-popover__arrow {
  top: -6px;
  left: calc(50% - 5px);
  border-right: none;
  border-bottom: none;
  border-top: 1px solid var(--73-border);
  border-left: 1px solid var(--73-border);
}

/* 面板在锚点左侧 → 尖角朝右：换成上边 + 右边 */
.t73-popover__panel--left .t73-popover__arrow {
  top: calc(50% - 5px);
  right: -6px;
  border-bottom: none;
  border-top: 1px solid var(--73-border);
}

/* 面板在锚点右侧 → 尖角朝左：换成左边 + 下边 */
.t73-popover__panel--right .t73-popover__arrow {
  top: calc(50% - 5px);
  left: -6px;
  border-right: none;
  border-left: 1px solid var(--73-border);
}

.t73-popover-enter-active,
.t73-popover-leave-active {
  transition:
    opacity var(--73-transition),
    transform var(--73-transition);
}

.t73-popover-enter-from,
.t73-popover-leave-to {
  opacity: 0;
}
</style>
