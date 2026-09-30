<script setup lang="ts">
/**
 * TDialog
 *
 * 接替 `<el-dialog>`（user-client 里 30 处）。**这个组件的价值几乎全在行为上**，
 * 样式只是把令牌套上去：
 *
 * - 焦点陷阱（`useFocusTrap`）：Tab 在弹窗内循环、关闭后焦点还给触发它的按钮
 * - Esc 与点遮罩关闭（`useDismissable`）：多层弹窗时只有最上面那层响应
 * - 背景滚动锁定（`useBodyScrollLock`）：引用计数，两层叠着时不会提前解锁
 *
 * 这三件事 Element Plus 帮我们做了，所以它才不好换掉。自己实现之后，
 * 换主题就真的只是换令牌了。
 *
 * ## 与 Element 的差异
 *
 * | | Element Plus | 这里 |
 * | --- | --- | --- |
 * | 绑定 | `v-model="visible"` | `v-model:open="visible"` |
 * | 关闭事件 | `@close` 无参数 | `@close(reason)` 带原因 |
 * | 内容生命周期 | 默认保留，`destroy-on-close` 才销毁 | **默认每次打开重新挂载**（`v-if`），表单不会残留上一次的错误态 |
 * | 遮罩层级 | 依赖 Element 的 `--el-index` 递增 | 固定 `--73-z-dialog`（3000，与 `modal.css` 提升过的遮罩一致） |
 */
import { computed, ref, useAttrs, useId } from 'vue'
import { useBodyScrollLock } from '../../primitives/useBodyScrollLock'
import { useDismissable } from '../../primitives/useDismissable'
import { useFocusTrap } from '../../primitives/useFocusTrap'
import type { TDialogCloseReason, TDialogEmits, TDialogProps } from './types'

defineOptions({ name: 'TDialog', inheritAttrs: false })

const props = withDefaults(defineProps<TDialogProps>(), {
  open: false,
  title: undefined,
  width: 480,
  closable: true,
  maskClosable: true,
  escapeClosable: true,
  lockScroll: true,
  teleportTo: 'body',
  ariaLabel: undefined,
})

const emit = defineEmits<TDialogEmits>()
const attrs = useAttrs()

const panelRef = ref<HTMLElement | null>(null)
const titleId = useId()

const isOpen = computed(() => props.open)

const panelStyle = computed(() => ({
  '--t73-dialog-width': typeof props.width === 'number' ? `${props.width}px` : props.width,
}))

useBodyScrollLock(computed(() => props.open && props.lockScroll))
useFocusTrap(panelRef, isOpen)

useDismissable({
  element: panelRef,
  enabled: isOpen,
  closeOnEscape: computed(() => props.escapeClosable),
  // 「点外部」在这里就是点遮罩：遮罩铺满全屏，落在面板外的一律算遮罩
  closeOnOutside: computed(() => props.maskClosable),
  onDismiss: (reason) => requestClose(reason === 'escape' ? 'escape' : 'mask'),
})

function requestClose(reason: TDialogCloseReason): void {
  emit('update:open', false)
  emit('close', reason)
}

/** 供外部（如表单提交成功后）以代码方式关闭，走同一套事件 */
function close(): void {
  requestClose('api')
}

defineExpose({ close, panelRef })
</script>

<template>
  <Teleport :to="teleportTo || 'body'" :disabled="teleportTo === false">
    <Transition name="t73-dialog" @after-enter="emit('opened')" @after-leave="emit('closed')">
      <div v-if="open" class="t73-dialog-overlay">
        <div
          ref="panelRef"
          class="t73-dialog t73"
          v-bind="attrs"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title || $slots.title ? titleId : undefined"
          :aria-label="title || $slots.title ? undefined : ariaLabel"
          :style="panelStyle"
          tabindex="-1"
        >
          <header v-if="title || $slots.title || closable" class="t73-dialog__header">
            <h2 :id="titleId" class="t73-dialog__title">
              <slot name="title">{{ title }}</slot>
            </h2>
            <button
              v-if="closable"
              type="button"
              class="t73-dialog__close"
              aria-label="关闭"
              @click="requestClose('close-button')"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" />
              </svg>
            </button>
          </header>

          <div class="t73-dialog__body"><slot /></div>

          <footer v-if="$slots.footer" class="t73-dialog__footer"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.t73-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--73-z-dialog);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--73-dialog-veil);
}

.t73-dialog {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--t73-dialog-width, 480px);
  /* 窄屏兜底：.dev-recharge-dialog 用的就是这个算式 */
  max-width: calc(100vw - 32px);
  max-height: calc(100dvh - 64px);
  overflow: hidden;
  border: 1px solid var(--73-border);
  border-radius: var(--73-radius-dialog);
  background: var(--73-surface-strong);
  box-shadow: var(--73-shadow-dialog);
}

/* 触屏档：弹窗几乎占满宽度（与 dev-responsive.css 的 92vw 同口径） */
@media (max-width: 640px) {
  .t73-dialog-overlay {
    padding: 12px;
  }

  .t73-dialog {
    width: 92vw;
    max-width: 92vw;
    max-height: calc(100dvh - 48px);
  }
}

.t73-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 64px 14px 24px;
}

.t73-dialog__title {
  margin: 0;
  font-size: var(--73-font-size-dialog-title);
  font-weight: var(--73-font-weight-bold);
  line-height: 1.35;
  color: var(--73-ink);
}

.t73-dialog__close {
  position: absolute;
  top: 22px;
  right: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: var(--73-radius-control);
  background: transparent;
  color: var(--73-ink-muted);
  cursor: pointer;
  transition:
    background-color var(--73-transition),
    color var(--73-transition);
}

.t73-dialog__close:hover {
  background: var(--73-accent-soft);
  color: var(--73-accent);
}

.t73-dialog__close:focus-visible {
  outline: none;
  box-shadow: var(--73-focus-ring);
}

.t73-dialog__close svg {
  width: 16px;
  height: 16px;
}

.t73-dialog__body {
  padding: 0 24px 24px;
  overflow-y: auto;
}

.t73-dialog__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--73-border-soft);
}

/* --- 进出场 --- */
.t73-dialog-enter-active,
.t73-dialog-leave-active {
  transition: opacity var(--73-transition);
}

.t73-dialog-enter-active .t73-dialog,
.t73-dialog-leave-active .t73-dialog {
  transition:
    opacity var(--73-transition),
    transform var(--73-transition);
}

.t73-dialog-enter-from,
.t73-dialog-leave-to {
  opacity: 0;
}

.t73-dialog-enter-from .t73-dialog,
.t73-dialog-leave-to .t73-dialog {
  transform: translateY(8px) scale(0.98);
}
</style>
